import type { Prisma } from '@prisma/client';
import type {
  CreateRunnerInput,
  GameEngineFactory,
  PlayerEvent,
  RoundRunner,
} from '../types.js';
import { TabooConfigSchema, type TabooConfig } from './config.js';

interface TabooPromptPayload {
  word: string;
  forbidden: string[];
  category?: string | null;
}

interface PromptRow {
  id: string;
  difficulty: number;
  payload: TabooPromptPayload;
}

interface TeamSeat {
  id: string;
  position: number;
  cards: PromptRow[];
}

interface TurnState {
  team: TeamSeat;
  opponents: TeamSeat[];
  startedAtMs: number;
  correctCount: number;
  skipCount: number;
  tabooCount: number;
  currentPrompt: PromptRow | null;
  events: Array<{
    promptId: string;
    result: 'correct' | 'skip' | 'taboo';
    challengerTeamId?: string;
    forbiddenWord?: string;
  }>;
}

interface TeamRunning {
  totalPoints: number;
  correct: number;
  skips: number;
  taboos: number;
  breakdown: Array<Record<string, unknown>>;
}

export class TabooRoundRunner implements RoundRunner {
  readonly roundId: string;
  private readonly partyId: string;
  private readonly config: TabooConfig;
  private readonly deps: CreateRunnerInput['deps'];
  private readonly teams: TeamSeat[];
  private readonly running = new Map<string, TeamRunning>();
  private currentTeamIndex = -1;
  private turn: TurnState | null = null;
  private turnTimer: unknown = null;
  private gapTimer: unknown = null;
  private aborted = false;

  constructor(input: CreateRunnerInput, teams: TeamSeat[]) {
    this.roundId = input.roundId;
    this.partyId = input.partyId;
    this.deps = input.deps;
    this.config = TabooConfigSchema.parse(input.config);
    this.teams = teams;
  }

  async start() {
    await this.startNextTurn();
  }

  async handleEvent(type: string, input: PlayerEvent) {
    if (this.aborted || !this.turn) return;

    if (type === 'correct' && input.teamId === this.turn.team.id) {
      await this.recordCorrect();
    } else if (type === 'skip' && input.teamId === this.turn.team.id) {
      await this.recordSkip();
    } else if ((type === 'taboo' || type === 'challenge') && input.teamId !== this.turn.team.id) {
      await this.recordTaboo(input);
    }
  }

  async abort() {
    this.aborted = true;
    this.clearTimers();
  }

  private async startNextTurn() {
    if (this.aborted) return;
    this.currentTeamIndex++;
    if (this.currentTeamIndex >= this.teams.length) {
      await this.complete();
      return;
    }

    const team = this.teams[this.currentTeamIndex]!;
    this.turn = {
      team,
      opponents: this.teams.filter((t) => t.id !== team.id),
      startedAtMs: this.deps.clock.now(),
      correctCount: 0,
      skipCount: 0,
      tabooCount: 0,
      currentPrompt: null,
      events: [],
    };

    const deadlineAt = new Date(
      this.turn.startedAtMs + this.config.secondsPerTurn * 1000,
    ).toISOString();

    this.deps.emit(this.partyId, 'turn:started', {
      roundId: this.roundId,
      teamId: team.id,
      turnNumber: this.currentTeamIndex + 1,
      total: this.teams.length,
      deadlineAt,
    });

    this.serveCard();

    this.turnTimer = this.deps.clock.setTimeout(() => {
      this.endTurn().catch((err) => console.error('[taboo] endTurn failed', err));
    }, this.config.secondsPerTurn * 1000);
  }

  private serveCard() {
    if (!this.turn) return;
    const card = this.turn.team.cards.shift();
    if (!card) {
      this.clearTimers();
      this.endTurn().catch((err) => console.error('[taboo] endTurn failed', err));
      return;
    }
    this.turn.currentPrompt = card;

    const payload = {
      roundId: this.roundId,
      promptId: card.id,
      teamId: this.turn.team.id,
      word: card.payload.word,
      forbidden: card.payload.forbidden,
      category: card.payload.category ?? null,
    };

    // Acting team gets the card privately. Opposing team rooms also get it so
    // their clients can show a challenge button for forbidden-word calls.
    this.deps.emit(`team:${this.turn.team.id}`, 'prompt:next', payload);
    for (const opponent of this.turn.opponents) {
      this.deps.emit(`team:${opponent.id}`, 'prompt:challenge', payload);
    }
  }

  private async recordCorrect() {
    if (!this.turn || !this.turn.currentPrompt) return;
    const prompt = this.turn.currentPrompt;
    this.turn.correctCount++;
    this.turn.events.push({ promptId: prompt.id, result: 'correct' });

    this.deps.emit(this.partyId, 'score:updated', {
      roundId: this.roundId,
      teamId: this.turn.team.id,
      delta: this.config.basePointsPerCorrect,
      reason: 'correct',
      promptId: prompt.id,
    });

    this.serveCard();
  }

  private async recordSkip() {
    if (!this.turn || !this.turn.currentPrompt) return;
    if (this.turn.skipCount >= this.config.maxSkipsPerTurn) return;

    const prompt = this.turn.currentPrompt;
    this.turn.skipCount++;
    this.turn.events.push({ promptId: prompt.id, result: 'skip' });

    this.deps.emit(this.partyId, 'score:updated', {
      roundId: this.roundId,
      teamId: this.turn.team.id,
      delta: -this.config.skipPenalty,
      reason: 'skip',
      promptId: prompt.id,
    });

    this.serveCard();
  }

  private async recordTaboo(input: PlayerEvent) {
    if (!this.turn || !this.turn.currentPrompt) return;
    const prompt = this.turn.currentPrompt;
    const forbiddenWord = extractForbiddenWord(input.payload);
    this.turn.tabooCount++;
    this.turn.events.push({
      promptId: prompt.id,
      result: 'taboo',
      challengerTeamId: input.teamId,
      forbiddenWord,
    });

    this.deps.emit(this.partyId, 'score:updated', {
      roundId: this.roundId,
      teamId: this.turn.team.id,
      challengerTeamId: input.teamId,
      delta: -this.config.forbiddenWordPenalty,
      reason: 'taboo',
      promptId: prompt.id,
      forbiddenWord,
    });

    this.serveCard();
  }

  private async endTurn() {
    if (this.aborted || !this.turn) return;
    this.clearTimers();
    const turn = this.turn;
    this.turn = null;

    const turnPoints = Math.max(
      0,
      turn.correctCount * this.config.basePointsPerCorrect -
        turn.skipCount * this.config.skipPenalty -
        turn.tabooCount * this.config.forbiddenWordPenalty,
    );
    const running = this.runningFor(turn.team.id);
    running.correct += turn.correctCount;
    running.skips += turn.skipCount;
    running.taboos += turn.tabooCount;
    running.totalPoints += turnPoints;
    running.breakdown.push({
      turn: this.currentTeamIndex + 1,
      correct: turn.correctCount,
      skips: turn.skipCount,
      taboos: turn.tabooCount,
      turnPoints,
      events: turn.events,
    });

    await this.deps.prisma.score.upsert({
      where: { roundId_teamId: { roundId: this.roundId, teamId: turn.team.id } },
      update: {
        points: running.totalPoints,
        breakdown: { events: running.breakdown } as Prisma.InputJsonValue,
      },
      create: {
        roundId: this.roundId,
        teamId: turn.team.id,
        points: running.totalPoints,
        breakdown: { events: running.breakdown } as Prisma.InputJsonValue,
      },
    });

    this.deps.emit(this.partyId, 'turn:ended', {
      roundId: this.roundId,
      teamId: turn.team.id,
      correct: turn.correctCount,
      skips: turn.skipCount,
      taboos: turn.tabooCount,
      turnPoints,
      totalPoints: running.totalPoints,
    });

    this.gapTimer = this.deps.clock.setTimeout(() => {
      this.startNextTurn().catch((err) => console.error('[taboo] startNextTurn failed', err));
    }, this.config.secondsBetweenTurns * 1000);
  }

  private async complete() {
    if (this.aborted) return;
    await this.deps.onCompleted(this.roundId);
  }

  private runningFor(teamId: string): TeamRunning {
    let r = this.running.get(teamId);
    if (!r) {
      r = { totalPoints: 0, correct: 0, skips: 0, taboos: 0, breakdown: [] };
      this.running.set(teamId, r);
    }
    return r;
  }

  private clearTimers() {
    if (this.turnTimer) {
      this.deps.clock.clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    if (this.gapTimer) {
      this.deps.clock.clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
  }
}

export const tabooEngine: GameEngineFactory = {
  slug: 'taboo',
  configSchema: TabooConfigSchema,
  async create(input) {
    const game = await input.deps.prisma.gameDefinition.findUnique({
      where: { slug: 'taboo' },
    });
    if (!game) throw new Error("Taboo GameDefinition not found — run db:seed first.");

    const config = TabooConfigSchema.parse(input.config);

    const teams = await input.deps.prisma.team.findMany({
      where: { partyId: input.partyId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });
    if (teams.length === 0) {
      throw new Error('Taboo needs at least one team in the party.');
    }

    const candidates = await input.deps.prisma.prompt.findMany({
      where: {
        gameDefinitionId: game.id,
        difficulty: { gte: config.difficultyMin, lte: config.difficultyMax },
        ...(config.categories && config.categories.length > 0
          ? { tags: { hasSome: config.categories } }
          : {}),
      },
      select: { id: true, difficulty: true, payload: true },
    });
    if (candidates.length === 0) {
      throw new Error(
        `No taboo prompts match the requested filters (difficulty ${config.difficultyMin}–${config.difficultyMax}` +
          (config.categories?.length ? `, categories: ${config.categories.join(', ')}` : '') +
          '). Seed more content or widen the filter.',
      );
    }

    const pool = shuffleArr(
      candidates as unknown as Array<{ id: string; difficulty: number; payload: TabooPromptPayload }>,
    );

    const seats: TeamSeat[] = teams.map((t, i) => {
      const start = i * config.cardsPerTurn;
      const slice: Array<{ id: string; difficulty: number; payload: TabooPromptPayload }> = [];
      for (let k = 0; k < config.cardsPerTurn && pool.length > 0; k++) {
        slice.push(pool[(start + k) % pool.length]!);
      }
      return { id: t.id, position: t.position, cards: slice };
    });

    return new TabooRoundRunner(input, seats);
  },
};

function extractForbiddenWord(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === 'object' &&
    'forbiddenWord' in payload &&
    typeof payload.forbiddenWord === 'string'
  ) {
    return payload.forbiddenWord;
  }
  return undefined;
}

function shuffleArr<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

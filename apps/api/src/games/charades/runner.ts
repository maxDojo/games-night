import type { Prisma } from '@prisma/client';
import type {
  CreateRunnerInput,
  GameEngineFactory,
  PlayerEvent,
  RoundRunner,
} from '../types.js';
import { CharadesConfigSchema } from './config.js';

// ---------------------------------------------------------------------------
// CharadesRoundRunner
// ---------------------------------------------------------------------------
// Turn-based: teams take turns (in Team.position order) acting out phrases for
// secondsPerTurn while their teammates guess. The team's players (any of them
// — usually the captain holding the phone) emit:
//
//   round:event { type: 'correct' }   → +basePointsPerCorrect, next phrase
//   round:event { type: 'skip' }      → -skipPenalty (up to maxSkipsPerTurn), next phrase
//
// Privacy: the phrase is emitted ONLY to the acting team's room (`team:<id>`)
// via the team-scoped socket subscription set up in party:join. The party-wide
// `turn:started` event tells everyone *which* team is acting + when the timer
// ends, but not the phrase itself.
//
// Lifecycle:
//   start() → first turn
//     emit turn:started (party room) + prompt:next (team room)
//     accept correct/skip events from the acting team
//     timer fires (secondsPerTurn) OR phrases exhausted → turn:ended
//     wait secondsBetweenTurns
//     → next turn (or onCompleted when no teams left)
//
// Scoring:
//   points = max(0, correctCount × basePointsPerCorrect − skipCount × skipPenalty)
//   No difficulty multiplier, no time bonus, no streak bonus. Charades is a
//   volume game; nuance lives in Trivia.
// ---------------------------------------------------------------------------

interface CharadesConfig {
  secondsPerTurn: number;
  secondsBetweenTurns: number;
  basePointsPerCorrect: number;
  skipPenalty: number;
  maxSkipsPerTurn: number;
}

const CONFIG_DEFAULTS: CharadesConfig = {
  secondsPerTurn: 60,
  secondsBetweenTurns: 4,
  basePointsPerCorrect: 100,
  skipPenalty: 25,
  maxSkipsPerTurn: 3,
};

interface CharadesPromptPayload {
  phrase: string;
  category?: string | null;
}

interface PromptRow {
  id: string;
  difficulty: number;
  payload: CharadesPromptPayload;
}

interface TeamSeat {
  id: string;
  position: number;
  /** Per-team queue of phrases drawn at start. */
  phrases: PromptRow[];
}

interface TurnState {
  team: TeamSeat;
  startedAtMs: number;
  correctCount: number;
  skipCount: number;
  currentPrompt: PromptRow | null;
  events: Array<{ promptId: string; result: 'correct' | 'skip' }>;
}

// Per-team scratchpad for cross-turn aggregation. Charades currently only does
// one turn per team per round, but this keeps the upsert pattern consistent
// with how Trivia accumulates so future multi-turn formats Just Work.
interface TeamRunning {
  totalPoints: number;
  correct: number;
  skips: number;
  breakdown: Array<Record<string, unknown>>;
}

export class CharadesRoundRunner implements RoundRunner {
  readonly roundId: string;
  private readonly partyId: string;
  private readonly config: CharadesConfig;
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
    this.config = { ...CONFIG_DEFAULTS, ...(input.config as Partial<CharadesConfig>) };
    this.teams = teams;
  }

  async start() {
    await this.startNextTurn();
  }

  async handleEvent(type: string, input: PlayerEvent) {
    if (this.aborted || !this.turn) return;
    if (input.teamId !== this.turn.team.id) return; // only the acting team's players count

    if (type === 'correct') {
      await this.recordCorrect();
    } else if (type === 'skip') {
      await this.recordSkip();
    }
    // Any other event type is silently ignored.
  }

  async abort() {
    this.aborted = true;
    this.clearTimers();
  }

  // -----------------------------------------------------------------------

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
      startedAtMs: this.deps.clock.now(),
      correctCount: 0,
      skipCount: 0,
      currentPrompt: null,
      events: [],
    };

    const deadlineAt = new Date(
      this.turn.startedAtMs + this.config.secondsPerTurn * 1000,
    ).toISOString();

    // Public meta — everyone sees who's up.
    this.deps.emit(this.partyId, 'turn:started', {
      roundId: this.roundId,
      teamId: team.id,
      turnNumber: this.currentTeamIndex + 1,
      total: this.teams.length,
      deadlineAt,
    });

    // Hand the team their first phrase.
    this.servePhraseToActingTeam();

    this.turnTimer = this.deps.clock.setTimeout(() => {
      this.endTurn().catch((err) => console.error('[charades] endTurn failed', err));
    }, this.config.secondsPerTurn * 1000);
  }

  private servePhraseToActingTeam() {
    if (!this.turn) return;
    const phrase = this.turn.team.phrases.shift();
    if (!phrase) {
      // Team ran out of phrases before time expired. End the turn.
      this.clearTimers();
      this.endTurn().catch((err) => console.error('[charades] endTurn failed', err));
      return;
    }
    this.turn.currentPrompt = phrase;

    this.deps.emit(`team:${this.turn.team.id}`, 'prompt:next', {
      kind: 'charades-phrase',
      roundId: this.roundId,
      promptId: phrase.id,
      teamId: this.turn.team.id,
      phrase: phrase.payload.phrase,
      category: phrase.payload.category ?? null,
    });
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

    this.servePhraseToActingTeam();
  }

  private async recordSkip() {
    if (!this.turn || !this.turn.currentPrompt) return;
    if (this.turn.skipCount >= this.config.maxSkipsPerTurn) {
      // No more free skips this turn — silently no-op (UI can grey the button).
      return;
    }
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

    this.servePhraseToActingTeam();
  }

  private async endTurn() {
    if (this.aborted || !this.turn) return;
    this.clearTimers();
    const turn = this.turn;
    this.turn = null;

    const turnPoints = Math.max(
      0,
      turn.correctCount * this.config.basePointsPerCorrect -
        turn.skipCount * this.config.skipPenalty,
    );
    const running = this.runningFor(turn.team.id);
    running.correct += turn.correctCount;
    running.skips += turn.skipCount;
    running.totalPoints += turnPoints;
    running.breakdown.push({
      turn: this.currentTeamIndex + 1,
      correct: turn.correctCount,
      skips: turn.skipCount,
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
      turnPoints,
      totalPoints: running.totalPoints,
    });

    // Brief inter-turn pause, then next team.
    this.gapTimer = this.deps.clock.setTimeout(() => {
      this.startNextTurn().catch((err) => console.error('[charades] startNextTurn failed', err));
    }, this.config.secondsBetweenTurns * 1000);
  }

  private async complete() {
    if (this.aborted) return;
    await this.deps.onCompleted(this.roundId);
  }

  private runningFor(teamId: string): TeamRunning {
    let r = this.running.get(teamId);
    if (!r) {
      r = { totalPoints: 0, correct: 0, skips: 0, breakdown: [] };
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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const charadesEngine: GameEngineFactory = {
  slug: 'charades',
  configSchema: CharadesConfigSchema,
  async create(input) {
    const game = await input.deps.prisma.gameDefinition.findUnique({
      where: { slug: 'charades' },
    });
    if (!game) throw new Error("Charades GameDefinition not found — run db:seed first.");

    const config = CharadesConfigSchema.parse(input.config);

    const teams = await input.deps.prisma.team.findMany({
      where: { partyId: input.partyId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });
    if (teams.length === 0) {
      throw new Error('Charades needs at least one team in the party.');
    }

    // Pull candidate phrases under the host's filters, then deal team slices.
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
        `No charades prompts match the requested filters (difficulty ${config.difficultyMin}–${config.difficultyMax}` +
          (config.categories?.length ? `, categories: ${config.categories.join(', ')}` : '') +
          '). Seed more content or widen the filter.',
      );
    }

    const pool = shuffleArr(
      candidates as unknown as Array<{ id: string; difficulty: number; payload: CharadesPromptPayload }>,
    );

    // Deal: team 0 → pool[0..N-1], team 1 → pool[N..2N-1], etc.
    // If candidate pool is short, wrap so every team still gets phrasesPerTurn.
    const seats: TeamSeat[] = teams.map((t, i) => {
      const start = i * config.phrasesPerTurn;
      const slice: Array<{ id: string; difficulty: number; payload: CharadesPromptPayload }> = [];
      for (let k = 0; k < config.phrasesPerTurn && pool.length > 0; k++) {
        slice.push(pool[(start + k) % pool.length]!);
      }
      return { id: t.id, position: t.position, phrases: slice };
    });

    return new CharadesRoundRunner(input, seats);
  },
};

function shuffleArr<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

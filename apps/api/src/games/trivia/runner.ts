import type { Prisma } from '@prisma/client';
import { scoreEvent } from '../../lib/scoring.js';
import type {
  CreateRunnerInput,
  GameEngineFactory,
  PlayerEvent,
  RoundRunner,
} from '../types.js';
import { TriviaConfigSchema } from './config.js';

// ---------------------------------------------------------------------------
// TriviaRoundRunner
// ---------------------------------------------------------------------------
// Owns a single trivia round in memory: prompt queue, current question state,
// per-team running totals + streaks, and the server-side timer.
//
// Lifecycle (server-driven):
//   start() ──┐
//             ▼
//   ┌─ emit prompt:next ── wait secondsPerQuestion ─ OR ─ all-teams answered ─┐
//   │                                                                         │
//   └──── emit prompt:reveal + score:updated ── wait secondsPerReveal ────────┘
//                                                              │
//                                                              ▼
//                                              next question  /  done
// ---------------------------------------------------------------------------

interface TriviaConfig {
  questionsPerRound: number;
  secondsPerQuestion: number;
  secondsPerReveal: number;
  basePoints: number;
  timeBonusMaxPct: number;
  difficultyMultiplier: Record<string, number>;
  streakBonusEvery: number;
  streakBonusPoints: number;
}

const CONFIG_DEFAULTS: TriviaConfig = {
  questionsPerRound: 10,
  secondsPerQuestion: 20,
  secondsPerReveal: 4,
  basePoints: 100,
  timeBonusMaxPct: 0.5,
  difficultyMultiplier: { '1': 1.0, '2': 1.25, '3': 1.5, '4': 1.75, '5': 2.0 },
  streakBonusEvery: 3,
  streakBonusPoints: 50,
};

interface TriviaPromptPayload {
  question: string;
  choices: string[];
  answer: string;
}

interface ActivePrompt {
  promptId: string;
  difficulty: number;
  payload: TriviaPromptPayload;
  startedAtMs: number;
  /** teamId → first-answer record. Only the first answer per team counts. */
  answers: Map<string, { choice: string; atMs: number; playerId: string }>;
}

interface TeamRunning {
  totalPoints: number;
  streak: number;
  correct: number;
  breakdown: Array<Record<string, unknown>>;
}

export class TriviaRoundRunner implements RoundRunner {
  readonly roundId: string;
  private readonly partyId: string;
  private readonly config: TriviaConfig;
  private readonly deps: CreateRunnerInput['deps'];
  private readonly prompts: Array<{ id: string; difficulty: number; payload: TriviaPromptPayload }>;
  private readonly running = new Map<string, TeamRunning>();
  private currentIndex = -1;
  private current: ActivePrompt | null = null;
  private timerHandle: unknown = null;
  private aborted = false;

  constructor(input: CreateRunnerInput, prompts: Array<{ id: string; difficulty: number; payload: TriviaPromptPayload }>) {
    this.roundId = input.roundId;
    this.partyId = input.partyId;
    this.deps = input.deps;
    this.config = { ...CONFIG_DEFAULTS, ...(input.config as Partial<TriviaConfig>) };
    this.prompts = prompts;
  }

  async start() {
    await this.nextQuestion();
  }

  async handleEvent(type: string, input: PlayerEvent) {
    if (type !== 'answer') return; // trivia only cares about answers.
    if (this.aborted || !this.current) return;
    // First answer per team only; ignore duplicates.
    if (this.current.answers.has(input.teamId)) return;

    const payload = (input.payload ?? {}) as { choice?: unknown };
    if (typeof payload?.choice !== 'string') return;
    // Sanity: choice must be one of the prompt's choices.
    if (!this.current.payload.choices.includes(payload.choice)) return;

    this.current.answers.set(input.teamId, {
      choice: payload.choice,
      atMs: this.deps.clock.now(),
      playerId: input.playerId,
    });

    // Short-circuit the timer if every team has answered.
    const teamCount = await this.countTeams();
    if (this.current.answers.size >= teamCount && teamCount > 0) {
      this.clearTimer();
      await this.revealAndAdvance();
    }
  }

  async abort() {
    this.aborted = true;
    this.clearTimer();
  }

  // -----------------------------------------------------------------------

  private async nextQuestion() {
    if (this.aborted) return;
    this.currentIndex++;
    if (this.currentIndex >= this.prompts.length) {
      await this.complete();
      return;
    }
    const p = this.prompts[this.currentIndex]!;
    this.current = {
      promptId: p.id,
      difficulty: p.difficulty,
      payload: p.payload,
      startedAtMs: this.deps.clock.now(),
      answers: new Map(),
    };

    const deadlineAt = new Date(this.current.startedAtMs + this.config.secondsPerQuestion * 1000);
    this.deps.emit(this.partyId, 'prompt:next', {
      roundId: this.roundId,
      promptId: p.id,
      questionNumber: this.currentIndex + 1,
      total: this.prompts.length,
      question: p.payload.question,
      choices: p.payload.choices,
      difficulty: p.difficulty,
      deadlineAt: deadlineAt.toISOString(),
    });

    this.timerHandle = this.deps.clock.setTimeout(() => {
      this.revealAndAdvance().catch((err) => {
        console.error('[trivia] revealAndAdvance failed', err);
      });
    }, this.config.secondsPerQuestion * 1000);
  }

  private async revealAndAdvance() {
    if (this.aborted || !this.current) return;
    this.clearTimer();
    const current = this.current;

    // Score each team that answered correctly.
    const perTeamThisQuestion = new Map<string, { points: number; correct: boolean; choice: string | null }>();
    for (const [teamId, ans] of current.answers) {
      const correct = ans.choice === current.payload.answer;
      let points = 0;
      const running = this.runningFor(teamId);

      if (correct) {
        running.streak += 1;
        running.correct += 1;
        const timeRemainingSec = Math.max(
          0,
          this.config.secondsPerQuestion - (ans.atMs - current.startedAtMs) / 1000,
        );
        const r = scoreEvent({
          basePoints: this.config.basePoints,
          difficulty: current.difficulty,
          difficultyMultiplier: this.normaliseDifficultyMult(),
          timeRemaining: timeRemainingSec,
          timeAllowed: this.config.secondsPerQuestion,
          timeBonusMaxPct: this.config.timeBonusMaxPct,
          currentStreak: running.streak,
          streakBonusEvery: this.config.streakBonusEvery,
          streakBonusPoints: this.config.streakBonusPoints,
        });
        points = r.points;
        running.totalPoints += points;
        running.breakdown.push({
          promptId: current.promptId,
          correct: true,
          points,
          ...r.breakdown,
        });
      } else {
        running.streak = 0;
        running.breakdown.push({ promptId: current.promptId, correct: false, points: 0 });
      }

      perTeamThisQuestion.set(teamId, { points, correct, choice: ans.choice });

      // Upsert running total for live leaderboard updates.
      await this.deps.prisma.score.upsert({
        where: { roundId_teamId: { roundId: this.roundId, teamId } },
        update: {
          points: running.totalPoints,
          breakdown: { events: running.breakdown } as Prisma.InputJsonValue,
        },
        create: {
          roundId: this.roundId,
          teamId,
          points: running.totalPoints,
          breakdown: { events: running.breakdown } as Prisma.InputJsonValue,
        },
      });

      this.deps.emit(this.partyId, 'score:updated', {
        roundId: this.roundId,
        teamId,
        points: running.totalPoints,
        delta: points,
      });
    }

    this.deps.emit(this.partyId, 'prompt:reveal', {
      roundId: this.roundId,
      promptId: current.promptId,
      questionNumber: this.currentIndex + 1,
      correctAnswer: current.payload.answer,
      perTeam: Object.fromEntries(perTeamThisQuestion),
    });

    this.current = null;
    this.timerHandle = this.deps.clock.setTimeout(() => {
      this.nextQuestion().catch((err) => console.error('[trivia] nextQuestion failed', err));
    }, this.config.secondsPerReveal * 1000);
  }

  private async complete() {
    if (this.aborted) return;
    await this.deps.onCompleted(this.roundId);
  }

  private runningFor(teamId: string): TeamRunning {
    let r = this.running.get(teamId);
    if (!r) {
      r = { totalPoints: 0, streak: 0, correct: 0, breakdown: [] };
      this.running.set(teamId, r);
    }
    return r;
  }

  /** Difficulty mult keys come back from JSON as strings; scoreEvent wants numbers. */
  private normaliseDifficultyMult(): Record<number, number> {
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(this.config.difficultyMultiplier)) {
      out[Number(k)] = v;
    }
    return out;
  }

  private async countTeams(): Promise<number> {
    return this.deps.prisma.team.count({ where: { partyId: this.partyId } });
  }

  private clearTimer() {
    if (this.timerHandle) {
      this.deps.clock.clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — wired into the engine registry.
// ---------------------------------------------------------------------------

export const triviaEngine: GameEngineFactory = {
  slug: 'trivia',
  configSchema: TriviaConfigSchema,
  async create(input) {
    // Pull GameDefinition id, then sample N prompts.
    const game = await input.deps.prisma.gameDefinition.findUnique({
      where: { slug: 'trivia' },
    });
    if (!game) throw new Error("Trivia GameDefinition not found — run db:seed first.");

    // The rounds route validates against TriviaConfigSchema at queue time, so
    // input.config should already be fully populated. Parse again here as a
    // safety net for test fixtures and any future caller that constructs a
    // factory directly.
    const config = TriviaConfigSchema.parse(input.config);

    // Use findMany so we can filter by tags + difficulty range. Sample size
    // (<= 50 questions) is small enough to shuffle in JS.
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
        `No trivia prompts match the requested filters (difficulty ${config.difficultyMin}–${config.difficultyMax}` +
          (config.categories?.length ? `, categories: ${config.categories.join(', ')}` : '') +
          '). Seed more content or widen the filter.',
      );
    }

    const sampled = shuffleAndTake(
      candidates as unknown as Array<{ id: string; difficulty: number; payload: TriviaPromptPayload }>,
      config.questionsPerRound,
    );

    return new TriviaRoundRunner(input, sampled);
  },
};

function shuffleAndTake<T>(arr: readonly T[], n: number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.slice(0, n);
}

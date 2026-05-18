import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TriviaRoundRunner } from '../../src/games/trivia/runner.js';
import type { EngineDeps, EngineClock } from '../../src/games/types.js';
import { makeMockPrisma, resetMocks } from '../helpers/mockPrisma.js';

// -- Test fake clock --------------------------------------------------------
// We don't use vi.useFakeTimers() globally because the runner schedules timers
// internally on tick boundaries we want to control precisely. Instead, a
// manual fake clock lets us "now = X; advance(Y)" assertions cleanly.

interface FakeTimer {
  id: number;
  fireAt: number;
  fn: () => void;
}

function makeFakeClock() {
  let now = 0;
  let nextId = 1;
  const timers: FakeTimer[] = [];
  const clock: EngineClock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const t: FakeTimer = { id: nextId++, fireAt: now + ms, fn };
      timers.push(t);
      return t.id;
    },
    clearTimeout: (h) => {
      const idx = timers.findIndex((t) => t.id === h);
      if (idx >= 0) timers.splice(idx, 1);
    },
  };
  async function advance(ms: number) {
    const target = now + ms;
    // Fire timers in chronological order until we reach target. Awaiting
    // between fires lets async chains in the runner settle before the next tick.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      timers.sort((a, b) => a.fireAt - b.fireAt);
      const due = timers[0];
      if (!due || due.fireAt > target) break;
      now = due.fireAt;
      timers.shift();
      due.fn();
      // Let any awaited promises in the runner's `.then` chains resolve.
      await Promise.resolve();
      await Promise.resolve();
    }
    now = target;
  }
  function setNow(t: number) {
    now = t;
  }
  return { clock, advance, setNow, get now() { return now; } };
}

// -- Helpers ----------------------------------------------------------------

function makePrompts(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `prompt_${i + 1}`,
    difficulty: 2,
    payload: {
      question: `Q${i + 1}`,
      choices: ['A', 'B', 'C', 'D'],
      answer: 'A',
    },
  }));
}

function setupRunner(opts: {
  prompts: ReturnType<typeof makePrompts>;
  config?: Record<string, unknown>;
  teamCount?: number;
}) {
  const { prisma, mocks } = makeMockPrisma();
  const fake = makeFakeClock();
  const emit = vi.fn();
  const onCompleted = vi.fn(async () => undefined);

  // Teams.count is awaited inside handleAnswer to know when to short-circuit.
  mocks.team.count.mockResolvedValue(opts.teamCount ?? 2);
  mocks.score.upsert.mockImplementation(async ({ create }) => ({
    id: 's',
    recordedAt: new Date(),
    ...create,
  }));

  const deps: EngineDeps = {
    prisma,
    emit,
    clock: fake.clock,
    onCompleted,
  };

  const runner = new TriviaRoundRunner(
    {
      roundId: 'r_1',
      partyId: 'party_1',
      config: opts.config ?? {},
      deps,
    },
    opts.prompts,
  );

  return { runner, fake, emit, onCompleted, mocks, prisma };
}

// ===========================================================================

describe('TriviaRoundRunner', () => {
  beforeEach(() => {
    // Squash console.error noise from intentional negative-path tests.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits prompt:next for the first question on start', async () => {
    const { runner, emit } = setupRunner({ prompts: makePrompts(3) });
    await runner.start();
    const calls = emit.mock.calls.filter((c) => c[1] === 'prompt:next');
    expect(calls).toHaveLength(1);
    const payload = calls[0]![2] as { questionNumber: number; total: number; question: string };
    expect(payload.questionNumber).toBe(1);
    expect(payload.total).toBe(3);
    expect(payload.question).toBe('Q1');
  });

  it('reveals + advances after secondsPerQuestion when no answers come in', async () => {
    const { runner, fake, emit } = setupRunner({
      prompts: makePrompts(2),
      config: { secondsPerQuestion: 20, secondsPerReveal: 5 },
    });
    await runner.start();

    await fake.advance(20_000); // question timeout
    expect(emit.mock.calls.find((c) => c[1] === 'prompt:reveal')).toBeTruthy();

    await fake.advance(5_000); // reveal pause → next question
    const promptCalls = emit.mock.calls.filter((c) => c[1] === 'prompt:next');
    expect(promptCalls).toHaveLength(2);
    expect((promptCalls[1]![2] as { questionNumber: number }).questionNumber).toBe(2);
  });

  it('scores a correct answer with time bonus and writes a Score upsert', async () => {
    const { runner, fake, emit, mocks } = setupRunner({
      prompts: makePrompts(1),
      config: { secondsPerQuestion: 20, secondsPerReveal: 1, basePoints: 100, timeBonusMaxPct: 0.5 },
      teamCount: 1,
    });
    await runner.start();

    // Answer at t=10s — half the window remaining → 25% time bonus → 125 base*1.25 mult = 156.25 → round to 156
    fake.setNow(10_000);
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'A' } });

    // All teams answered → reveal immediately
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.score.upsert).toHaveBeenCalled();
    const upsertArg = mocks.score.upsert.mock.calls[0]![0];
    // difficulty 2 → multiplier 1.25; base 100 * 1.25 * (1 + 0.25) = 156.25 → 156
    expect(upsertArg.create.points).toBe(156);

    const scoreEvent = emit.mock.calls.find((c) => c[1] === 'score:updated');
    expect(scoreEvent).toBeTruthy();
    expect((scoreEvent![2] as { delta: number }).delta).toBe(156);
  });

  it('awards zero on a wrong answer and resets the streak', async () => {
    const { runner, fake, mocks } = setupRunner({
      prompts: makePrompts(2),
      config: { secondsPerQuestion: 20, secondsPerReveal: 1, basePoints: 100 },
      teamCount: 1,
    });
    await runner.start();
    fake.setNow(5_000);
    // Wrong answer to Q1
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'B' } });
    await Promise.resolve(); await Promise.resolve();

    const firstUpsert = mocks.score.upsert.mock.calls[0]![0];
    expect(firstUpsert.create.points).toBe(0);
  });

  it('awards the streak bonus on the Nth consecutive correct', async () => {
    const prompts = makePrompts(3);
    const { runner, fake, mocks } = setupRunner({
      prompts,
      config: {
        secondsPerQuestion: 20,
        secondsPerReveal: 1,
        basePoints: 100,
        timeBonusMaxPct: 0, // turn off time bonus to keep arithmetic clean
        streakBonusEvery: 3,
        streakBonusPoints: 50,
      },
      teamCount: 1,
    });
    await runner.start();

    // Q1 correct
    fake.setNow(1_000);
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'A' } });
    await fake.advance(1_000); // reveal pause → Q2
    // Q2 correct
    fake.setNow(fake.now + 1_000);
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'A' } });
    await fake.advance(1_000); // reveal pause → Q3
    // Q3 correct → streak hits 3 → +50 bonus
    fake.setNow(fake.now + 1_000);
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'A' } });
    await Promise.resolve(); await Promise.resolve();

    // Difficulty 2 → mult 1.25. Per-question base = 100*1.25 = 125.
    // After Q1: 125; Q2: 250; Q3: 250 + 125 + 50 = 425.
    const calls = mocks.score.upsert.mock.calls.map((c) => c[0]);
    expect(calls[0]!.create.points).toBe(125);
    expect(calls[1]!.update.points).toBe(250);
    expect(calls[2]!.update.points).toBe(425);
  });

  it('counts only the first answer per team per question', async () => {
    const { runner, fake, mocks } = setupRunner({
      prompts: makePrompts(1),
      config: { secondsPerQuestion: 20, secondsPerReveal: 1, basePoints: 100, timeBonusMaxPct: 0 },
      teamCount: 1,
    });
    await runner.start();
    fake.setNow(5_000);

    // First (wrong) answer locks in 0.
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'B' } });
    // Second (correct) answer for the same team is ignored.
    await runner.handleEvent('answer', { playerId: 'p2', teamId: 't1', payload: { choice: 'A' } });
    await Promise.resolve(); await Promise.resolve();

    expect(mocks.score.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.score.upsert.mock.calls[0]![0].create.points).toBe(0);
  });

  it('short-circuits the timer when every team has answered', async () => {
    const { runner, fake, emit } = setupRunner({
      prompts: makePrompts(2),
      config: { secondsPerQuestion: 30, secondsPerReveal: 1 },
      teamCount: 2,
    });
    await runner.start();

    // Both teams answer well before the 30s deadline.
    fake.setNow(2_000);
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'A' } });
    await runner.handleEvent('answer', { playerId: 'p2', teamId: 't2', payload: { choice: 'B' } });
    await Promise.resolve(); await Promise.resolve();

    expect(emit.mock.calls.find((c) => c[1] === 'prompt:reveal')).toBeTruthy();
    // We have NOT advanced past 30s; reveal happened on its own.
    expect(fake.now).toBeLessThan(30_000);
  });

  it('calls onCompleted after the last question + reveal pause', async () => {
    const { runner, fake, onCompleted } = setupRunner({
      prompts: makePrompts(2),
      config: { secondsPerQuestion: 5, secondsPerReveal: 2 },
    });
    await runner.start();

    // Let Q1 time out + reveal pause + Q2 time out + reveal pause
    await fake.advance(5_000); // Q1 deadline
    await fake.advance(2_000); // reveal pause → Q2
    await fake.advance(5_000); // Q2 deadline
    await fake.advance(2_000); // reveal pause → onCompleted

    expect(onCompleted).toHaveBeenCalledWith('r_1');
  });

  it('abort() prevents further emits even if a timer was queued', async () => {
    const { runner, fake, emit } = setupRunner({
      prompts: makePrompts(2),
      config: { secondsPerQuestion: 5, secondsPerReveal: 2 },
    });
    await runner.start();
    const promptCallsBefore = emit.mock.calls.filter((c) => c[1] === 'prompt:next').length;
    await runner.abort();

    // Even if the runner had a scheduled timer at +5s, advance shouldn't fire it.
    await fake.advance(60_000);
    const promptCallsAfter = emit.mock.calls.filter((c) => c[1] === 'prompt:next').length;
    expect(promptCallsAfter).toBe(promptCallsBefore);
  });

  it('ignores malformed answer payloads', async () => {
    const { runner, fake, mocks } = setupRunner({
      prompts: makePrompts(1),
      config: { secondsPerQuestion: 5, secondsPerReveal: 1 },
      teamCount: 1,
    });
    await runner.start();

    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 123 } as never });
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: { choice: 'NOT_A_CHOICE' } });
    await runner.handleEvent('answer', { playerId: 'p1', teamId: 't1', payload: null as never });

    // No team has a recorded answer → timer must still tick to reveal.
    await fake.advance(5_000);
    await Promise.resolve(); await Promise.resolve();

    // No score upsert because no team answered.
    expect(mocks.score.upsert).not.toHaveBeenCalled();
  });
});

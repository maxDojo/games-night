import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CharadesRoundRunner } from '../../src/games/charades/runner.js';
import type { EngineClock, EngineDeps } from '../../src/games/types.js';
import { makeMockPrisma, resetMocks } from '../helpers/mockPrisma.js';

// Same fake clock pattern as the trivia tests — manual tick control beats
// vi.useFakeTimers for these kinds of nested-timer flows.
function makeFakeClock() {
  let now = 0;
  let nextId = 1;
  interface T { id: number; fireAt: number; fn: () => void }
  const timers: T[] = [];
  const clock: EngineClock = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const t: T = { id: nextId++, fireAt: now + ms, fn };
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
    // eslint-disable-next-line no-constant-condition
    while (true) {
      timers.sort((a, b) => a.fireAt - b.fireAt);
      const due = timers[0];
      if (!due || due.fireAt > target) break;
      now = due.fireAt;
      timers.shift();
      due.fn();
      await Promise.resolve();
      await Promise.resolve();
    }
    now = target;
  }
  return { clock, advance, get now() { return now; } };
}

function makePhrases(n: number, prefix = 'p'): Array<{ id: string; difficulty: number; payload: { phrase: string; category?: string | null } }> {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}_${i + 1}`,
    difficulty: 1,
    payload: { phrase: `Phrase ${i + 1}`, category: 'misc' },
  }));
}

function setupRunner(opts: {
  teams: Array<{ id: string; position: number; phraseCount?: number }>;
  config?: Record<string, unknown>;
}) {
  const { prisma, mocks } = makeMockPrisma();
  const fake = makeFakeClock();
  const emit = vi.fn();
  const onCompleted = vi.fn(async () => undefined);

  mocks.score.upsert.mockImplementation(async ({ create }) => ({
    id: 's',
    recordedAt: new Date(),
    ...create,
  }));

  const deps: EngineDeps = { prisma, emit, clock: fake.clock, onCompleted };
  const seats = opts.teams.map((t) => ({
    id: t.id,
    position: t.position,
    phrases: makePhrases(t.phraseCount ?? 10, t.id),
  }));

  const runner = new CharadesRoundRunner(
    { roundId: 'r_1', partyId: 'party_1', config: opts.config ?? {}, deps },
    seats,
  );
  return { runner, fake, emit, onCompleted, mocks };
}

describe('CharadesRoundRunner', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('emits turn:started + prompt:next on start', async () => {
    const { runner, emit } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
    });
    await runner.start();

    const turnStarted = emit.mock.calls.find((c) => c[1] === 'turn:started');
    expect(turnStarted).toBeTruthy();
    expect((turnStarted![2] as { teamId: string }).teamId).toBe('t1');

    const promptNext = emit.mock.calls.find((c) => c[1] === 'prompt:next');
    expect(promptNext).toBeTruthy();
    // Phrase goes to the team room (privacy), not the party room.
    expect(promptNext![0]).toBe('team:t1');
    expect((promptNext![2] as { kind: string; phrase: string }).kind).toBe('charades-phrase');
    expect((promptNext![2] as { phrase: string }).phrase).toBe('Phrase 1');
  });

  it("ignores events from non-acting teams", async () => {
    const { runner, emit, mocks } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: { secondsPerTurn: 30, basePointsPerCorrect: 100 },
    });
    await runner.start();
    emit.mockClear();

    // Wrong team tries to act — should be silently dropped.
    await runner.handleEvent('correct', { playerId: 'p99', teamId: 't2', payload: null });
    expect(emit).not.toHaveBeenCalled();
    expect(mocks.score.upsert).not.toHaveBeenCalled();
  });

  it('awards basePointsPerCorrect on correct + advances to next phrase', async () => {
    const { runner, emit } = setupRunner({
      teams: [{ id: 't1', position: 1 }],
      config: { secondsPerTurn: 30, basePointsPerCorrect: 100 },
    });
    await runner.start();
    emit.mockClear();

    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });

    const score = emit.mock.calls.find((c) => c[1] === 'score:updated');
    expect(score).toBeTruthy();
    expect((score![2] as { delta: number; reason: string }).delta).toBe(100);
    expect((score![2] as { reason: string }).reason).toBe('correct');

    // Next phrase should have been served to the team room.
    const nextPhrase = emit.mock.calls.find((c) => c[1] === 'prompt:next');
    expect(nextPhrase).toBeTruthy();
    expect((nextPhrase![2] as { phrase: string }).phrase).toBe('Phrase 2');
  });

  it('applies skip penalty and respects maxSkipsPerTurn', async () => {
    const { runner, emit } = setupRunner({
      teams: [{ id: 't1', position: 1 }],
      config: { secondsPerTurn: 30, skipPenalty: 25, maxSkipsPerTurn: 2 },
    });
    await runner.start();
    emit.mockClear();

    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });
    // Third skip should be silently rejected (no score:updated emitted).
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });

    const skipEvents = emit.mock.calls.filter(
      (c) => c[1] === 'score:updated' && (c[2] as { reason: string }).reason === 'skip',
    );
    expect(skipEvents).toHaveLength(2);
    expect((skipEvents[0]![2] as { delta: number }).delta).toBe(-25);
  });

  it('ends the turn when the timer fires and upserts the team total', async () => {
    const { runner, fake, emit, mocks } = setupRunner({
      teams: [{ id: 't1', position: 1 }],
      config: { secondsPerTurn: 20, secondsBetweenTurns: 1, basePointsPerCorrect: 100, skipPenalty: 25 },
    });
    await runner.start();
    // 3 correct + 1 skip = 300 − 25 = 275
    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });

    await fake.advance(20_000); // turn deadline

    const upsertArg = mocks.score.upsert.mock.calls[0]![0];
    expect(upsertArg.create.points).toBe(275);

    const turnEnded = emit.mock.calls.find((c) => c[1] === 'turn:ended');
    expect(turnEnded).toBeTruthy();
    expect((turnEnded![2] as { turnPoints: number; correct: number; skips: number }).turnPoints).toBe(275);
    expect((turnEnded![2] as { correct: number }).correct).toBe(3);
    expect((turnEnded![2] as { skips: number }).skips).toBe(1);
  });

  it('clamps net negative points to zero', async () => {
    const { runner, fake, mocks } = setupRunner({
      teams: [{ id: 't1', position: 1 }],
      config: { secondsPerTurn: 10, secondsBetweenTurns: 1, basePointsPerCorrect: 10, skipPenalty: 100, maxSkipsPerTurn: 5 },
    });
    await runner.start();
    // 1 correct (10) − 3 skips (300) = -290 → clamp to 0
    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });

    await fake.advance(10_000);

    expect(mocks.score.upsert.mock.calls[0]![0].create.points).toBe(0);
  });

  it('advances to the next team after the inter-turn pause', async () => {
    const { runner, fake, emit } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: { secondsPerTurn: 5, secondsBetweenTurns: 2, basePointsPerCorrect: 100 },
    });
    await runner.start();

    await fake.advance(5_000); // turn 1 timer fires
    await fake.advance(2_000); // inter-turn pause → next team

    const turnStarts = emit.mock.calls.filter((c) => c[1] === 'turn:started');
    expect(turnStarts).toHaveLength(2);
    expect((turnStarts[1]![2] as { teamId: string }).teamId).toBe('t2');
  });

  it('calls onCompleted after the last team finishes', async () => {
    const { runner, fake, onCompleted } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: { secondsPerTurn: 3, secondsBetweenTurns: 1 },
    });
    await runner.start();

    // t1 turn + pause + t2 turn + pause → complete
    await fake.advance(3_000);
    await fake.advance(1_000);
    await fake.advance(3_000);
    await fake.advance(1_000);

    expect(onCompleted).toHaveBeenCalledWith('r_1');
  });

  it("ends the turn early when the team's phrase pool is exhausted", async () => {
    const { runner, emit, mocks } = setupRunner({
      teams: [{ id: 't1', position: 1, phraseCount: 2 }],
      config: { secondsPerTurn: 60, basePointsPerCorrect: 100 },
    });
    await runner.start();
    // Burn through both phrases — the second `correct` advances to nothing,
    // which forces an early endTurn.
    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await Promise.resolve(); await Promise.resolve();

    expect(mocks.score.upsert).toHaveBeenCalled();
    const turnEnded = emit.mock.calls.find((c) => c[1] === 'turn:ended');
    expect(turnEnded).toBeTruthy();
  });

  it('abort() prevents further activity', async () => {
    const { runner, fake, emit } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: { secondsPerTurn: 5, secondsBetweenTurns: 1 },
    });
    await runner.start();
    const startedBefore = emit.mock.calls.filter((c) => c[1] === 'turn:started').length;
    await runner.abort();

    // Even if the in-flight timer was queued, advancing time shouldn't fire it.
    await fake.advance(60_000);
    const startedAfter = emit.mock.calls.filter((c) => c[1] === 'turn:started').length;
    expect(startedAfter).toBe(startedBefore);
  });

  it('ignores unknown event types', async () => {
    const { runner, emit } = setupRunner({
      teams: [{ id: 't1', position: 1 }],
      config: { secondsPerTurn: 30 },
    });
    await runner.start();
    emit.mockClear();

    await runner.handleEvent('mystery', { playerId: 'p1', teamId: 't1', payload: null });
    expect(emit).not.toHaveBeenCalled();
  });
});

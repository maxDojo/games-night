import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TabooRoundRunner } from '../../src/games/taboo/runner.js';
import type { EngineClock, EngineDeps } from '../../src/games/types.js';
import { makeMockPrisma } from '../helpers/mockPrisma.js';

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
  return { clock, advance };
}

function makeCards(n: number, prefix = 'c'): Array<{ id: string; difficulty: number; payload: { word: string; forbidden: string[]; category?: string | null } }> {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}_${i + 1}`,
    difficulty: 1,
    payload: { word: `Word ${i + 1}`, forbidden: [`Nope ${i + 1}`], category: 'misc' },
  }));
}

function setupRunner(opts: {
  teams: Array<{ id: string; position: number; cardCount?: number }>;
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
    cards: makeCards(t.cardCount ?? 10, t.id),
  }));

  const runner = new TabooRoundRunner(
    { roundId: 'r_1', partyId: 'party_1', config: opts.config ?? {}, deps },
    seats,
  );
  return { runner, fake, emit, onCompleted, mocks };
}

describe('TabooRoundRunner', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('emits the active card to the acting team and challenge cards to opponents', async () => {
    const { runner, emit } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
    });
    await runner.start();

    const actingPrompt = emit.mock.calls.find((c) => c[1] === 'prompt:next');
    expect(actingPrompt).toBeTruthy();
    expect(actingPrompt![0]).toBe('team:t1');
    expect((actingPrompt![2] as { word: string; forbidden: string[] }).word).toBe('Word 1');
    expect((actingPrompt![2] as { forbidden: string[] }).forbidden).toEqual(['Nope 1']);

    const challengePrompt = emit.mock.calls.find((c) => c[1] === 'prompt:challenge');
    expect(challengePrompt).toBeTruthy();
    expect(challengePrompt![0]).toBe('team:t2');
  });

  it('awards correct answers from the acting team and serves the next card', async () => {
    const { runner, emit } = setupRunner({
      teams: [{ id: 't1', position: 1 }],
      config: { basePointsPerCorrect: 100 },
    });
    await runner.start();
    emit.mockClear();

    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });

    const score = emit.mock.calls.find((c) => c[1] === 'score:updated');
    expect(score).toBeTruthy();
    expect((score![2] as { delta: number; reason: string }).delta).toBe(100);
    expect((score![2] as { reason: string }).reason).toBe('correct');

    const nextCard = emit.mock.calls.find((c) => c[1] === 'prompt:next');
    expect(nextCard).toBeTruthy();
    expect((nextCard![2] as { word: string }).word).toBe('Word 2');
  });

  it('accepts taboo challenges only from opposing teams', async () => {
    const { runner, emit } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: { forbiddenWordPenalty: 50 },
    });
    await runner.start();
    emit.mockClear();

    await runner.handleEvent('taboo', {
      playerId: 'p1',
      teamId: 't1',
      payload: { forbiddenWord: 'Nope 1' },
    });
    expect(emit).not.toHaveBeenCalled();

    await runner.handleEvent('challenge', {
      playerId: 'p2',
      teamId: 't2',
      payload: { forbiddenWord: 'Nope 1' },
    });

    const score = emit.mock.calls.find((c) => c[1] === 'score:updated');
    expect(score).toBeTruthy();
    expect((score![2] as { delta: number; reason: string; challengerTeamId: string }).delta).toBe(-50);
    expect((score![2] as { reason: string }).reason).toBe('taboo');
    expect((score![2] as { challengerTeamId: string }).challengerTeamId).toBe('t2');
  });

  it('scores correct, skips, and taboo penalties at turn end', async () => {
    const { runner, fake, mocks, emit } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: {
        secondsPerTurn: 20,
        secondsBetweenTurns: 1,
        basePointsPerCorrect: 100,
        skipPenalty: 25,
        forbiddenWordPenalty: 50,
      },
    });
    await runner.start();

    await runner.handleEvent('correct', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('skip', { playerId: 'p1', teamId: 't1', payload: null });
    await runner.handleEvent('taboo', { playerId: 'p2', teamId: 't2', payload: null });

    await fake.advance(20_000);

    expect(mocks.score.upsert.mock.calls[0]![0].create.points).toBe(25);
    const turnEnded = emit.mock.calls.find((c) => c[1] === 'turn:ended');
    expect(turnEnded).toBeTruthy();
    expect((turnEnded![2] as { correct: number; skips: number; taboos: number; turnPoints: number }).correct).toBe(1);
    expect((turnEnded![2] as { skips: number }).skips).toBe(1);
    expect((turnEnded![2] as { taboos: number }).taboos).toBe(1);
    expect((turnEnded![2] as { turnPoints: number }).turnPoints).toBe(25);
  });

  it('calls onCompleted after the last team finishes', async () => {
    const { runner, fake, onCompleted } = setupRunner({
      teams: [
        { id: 't1', position: 1 },
        { id: 't2', position: 2 },
      ],
      config: { secondsPerTurn: 5, secondsBetweenTurns: 1 },
    });
    await runner.start();

    await fake.advance(5_000);
    await fake.advance(1_000);
    await fake.advance(5_000);
    await fake.advance(1_000);

    expect(onCompleted).toHaveBeenCalledWith('r_1');
  });

  it('abort() cancels future turn activity', async () => {
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

    await fake.advance(60_000);
    const startedAfter = emit.mock.calls.filter((c) => c[1] === 'turn:started').length;
    expect(startedAfter).toBe(startedBefore);
  });
});

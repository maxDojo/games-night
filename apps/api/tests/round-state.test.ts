import { describe, it, expect } from 'vitest';
import {
  canCreateRound,
  canEndRound,
  canSkipRound,
  canStartRound,
  canWriteScore,
  mergeRoundConfig,
  tallyLeaderboard,
} from '../src/lib/round-state.js';

describe('canCreateRound', () => {
  it('allows during LOBBY / IN_PROGRESS / PAUSED', () => {
    expect(canCreateRound({ status: 'LOBBY' }).ok).toBe(true);
    expect(canCreateRound({ status: 'IN_PROGRESS' }).ok).toBe(true);
    expect(canCreateRound({ status: 'PAUSED' }).ok).toBe(true);
  });
  it('blocks once FINISHED or CANCELLED', () => {
    expect(canCreateRound({ status: 'FINISHED' })).toEqual({ ok: false, reason: 'Party is finished' });
    expect(canCreateRound({ status: 'CANCELLED' })).toEqual({ ok: false, reason: 'Party is cancelled' });
  });
});

describe('canStartRound', () => {
  it('allows PENDING when no other round is active', () => {
    expect(canStartRound({ status: 'PENDING' }, { status: 'LOBBY' }, false).ok).toBe(true);
  });
  it('blocks if another round is active', () => {
    const g = canStartRound({ status: 'PENDING' }, { status: 'IN_PROGRESS' }, true);
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.reason).toMatch(/already ACTIVE/);
  });
  it('blocks non-PENDING rounds', () => {
    expect(canStartRound({ status: 'ACTIVE' }, { status: 'IN_PROGRESS' }, false).ok).toBe(false);
    expect(canStartRound({ status: 'COMPLETED' }, { status: 'IN_PROGRESS' }, false).ok).toBe(false);
    expect(canStartRound({ status: 'SKIPPED' }, { status: 'IN_PROGRESS' }, false).ok).toBe(false);
  });
  it('blocks if party is finished/cancelled', () => {
    expect(canStartRound({ status: 'PENDING' }, { status: 'FINISHED' }, false).ok).toBe(false);
    expect(canStartRound({ status: 'PENDING' }, { status: 'CANCELLED' }, false).ok).toBe(false);
  });
});

describe('canEndRound / canSkipRound / canWriteScore', () => {
  it('canEndRound: only ACTIVE', () => {
    expect(canEndRound({ status: 'ACTIVE' }).ok).toBe(true);
    expect(canEndRound({ status: 'PENDING' }).ok).toBe(false);
    expect(canEndRound({ status: 'COMPLETED' }).ok).toBe(false);
  });
  it('canSkipRound: only PENDING', () => {
    expect(canSkipRound({ status: 'PENDING' }).ok).toBe(true);
    expect(canSkipRound({ status: 'ACTIVE' }).ok).toBe(false);
  });
  it('canWriteScore: only ACTIVE', () => {
    expect(canWriteScore({ status: 'ACTIVE' }).ok).toBe(true);
    expect(canWriteScore({ status: 'COMPLETED' }).ok).toBe(false);
  });
});

describe('mergeRoundConfig', () => {
  it('shallow-merges overrides into defaults', () => {
    expect(mergeRoundConfig({ a: 1, b: 2 }, { b: 99 })).toEqual({ a: 1, b: 99 });
  });
  it('returns defaults unchanged when overrides is undefined', () => {
    expect(mergeRoundConfig({ a: 1 }, undefined)).toEqual({ a: 1 });
  });
  it('overrides can add new keys', () => {
    expect(mergeRoundConfig({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

describe('tallyLeaderboard', () => {
  const teams = [
    { id: 't1', name: 'Red', color: '#f00', position: 1 },
    { id: 't2', name: 'Blue', color: '#00f', position: 2 },
    { id: 't3', name: 'Green', color: '#0f0', position: 3 },
  ];

  it('sums points per team across rounds', () => {
    const scores = [
      { teamId: 't1', points: 100 },
      { teamId: 't1', points: 50 },
      { teamId: 't2', points: 200 },
    ];
    const board = tallyLeaderboard(teams, scores);
    expect(board[0]).toMatchObject({ teamId: 't2', totalPoints: 200, roundsPlayed: 1, rank: 1 });
    expect(board[1]).toMatchObject({ teamId: 't1', totalPoints: 150, roundsPlayed: 2, rank: 2 });
    expect(board[2]).toMatchObject({ teamId: 't3', totalPoints: 0, roundsPlayed: 0, rank: 3 });
  });

  it('includes zero-score teams', () => {
    const board = tallyLeaderboard(teams, []);
    expect(board).toHaveLength(3);
    expect(board.map((b) => b.totalPoints)).toEqual([0, 0, 0]);
  });

  it('shares ranks on ties; orders ties by team.position', () => {
    const scores = [
      { teamId: 't1', points: 100 },
      { teamId: 't2', points: 100 },
      { teamId: 't3', points: 50 },
    ];
    const board = tallyLeaderboard(teams, scores);
    expect(board[0]).toMatchObject({ teamId: 't1', rank: 1 });
    expect(board[1]).toMatchObject({ teamId: 't2', rank: 1 }); // tied with t1
    expect(board[2]).toMatchObject({ teamId: 't3', rank: 3 }); // not 2, because rank 1 was shared
  });

  it('ignores scores for unknown teams', () => {
    const scores = [
      { teamId: 't1', points: 50 },
      { teamId: 'ghost', points: 1000 },
    ];
    const board = tallyLeaderboard(teams, scores);
    expect(board.find((b) => b.teamId === 'ghost')).toBeUndefined();
    expect(board.find((b) => b.teamId === 't1')!.totalPoints).toBe(50);
  });
});

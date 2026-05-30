import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('leaderboard route', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeMockPrisma>['mocks'];

  beforeAll(async () => {
    const built = makeMockPrisma();
    mocks = built.mocks;
    app = await buildApp({ prisma: built.prisma, disableSockets: true });
    await app.ready();
  });
  afterAll(async () => await app.close());
  beforeEach(() => resetMocks(mocks));

  it('returns revealed standings summed across rounds, ranked, including zero-score teams', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      status: 'IN_PROGRESS',
      scoresRevealed: true,
      teams: [
        { id: 't1', name: 'Red', color: '#f00', position: 1 },
        { id: 't2', name: 'Blue', color: '#00f', position: 2 },
        { id: 't3', name: 'Green', color: '#0f0', position: 3 },
      ],
      rounds: [
        {
          scores: [
            { teamId: 't1', points: 100 },
            { teamId: 't2', points: 200 },
          ],
        },
        {
          scores: [
            { teamId: 't1', points: 50 },
          ],
        },
      ],
      scoreEvents: [
        { teamId: 't3', delta: 75 },
      ],
    });

    const res = await app.inject({ method: 'GET', url: '/v1/parties/ABCDEF/leaderboard' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.partyStatus).toBe('IN_PROGRESS');
    expect(body.scoresRevealed).toBe(true);
    expect(body.entries).toHaveLength(3);
    expect(body.entries[0]).toMatchObject({ teamId: 't2', totalPoints: 200, rank: 1, roundsPlayed: 1 });
    expect(body.entries[1]).toMatchObject({ teamId: 't1', totalPoints: 150, rank: 2, roundsPlayed: 2 });
    expect(body.entries[2]).toMatchObject({ teamId: 't3', totalPoints: 75, rank: 3, roundsPlayed: 0 });
  });

  it('hides standings until the host reveals scores', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      status: 'IN_PROGRESS',
      scoresRevealed: false,
      teams: [
        { id: 't1', name: 'Red', color: '#f00', position: 1 },
        { id: 't2', name: 'Blue', color: '#00f', position: 2 },
      ],
      rounds: [{ scores: [{ teamId: 't1', points: 100 }] }],
      scoreEvents: [{ teamId: 't2', delta: 50 }],
    });

    const res = await app.inject({ method: 'GET', url: '/v1/parties/ABCDEF/leaderboard' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.scoresRevealed).toBe(false);
    expect(body.entries).toEqual([]);
  });

  it('returns 404 for unknown party', async () => {
    mocks.party.findUnique.mockResolvedValue(null);
    const res = await app.inject({ method: 'GET', url: '/v1/parties/ZZZZZZ/leaderboard' });
    expect(res.statusCode).toBe(404);
  });

  it('returns an empty entries array when there are no teams', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      status: 'LOBBY',
      scoresRevealed: false,
      teams: [],
      rounds: [],
      scoreEvents: [],
    });
    const res = await app.inject({ method: 'GET', url: '/v1/parties/ABCDEF/leaderboard' });
    expect(res.statusCode).toBe(200);
    expect(res.json().entries).toEqual([]);
  });
});

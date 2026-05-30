import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('score event routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeMockPrisma>['mocks'];
  let hostToken: string;
  let otherToken: string;

  beforeAll(async () => {
    const built = makeMockPrisma();
    mocks = built.mocks;
    app = await buildApp({ prisma: built.prisma, disableSockets: true });
    await app.ready();
    hostToken = app.jwt.sign({ sub: 'host_1', email: 'host@x.co' });
    otherToken = app.jwt.sign({ sub: 'other_1', email: 'other@x.co' });
  });

  afterAll(async () => await app.close());
  beforeEach(() => resetMocks(mocks));

  it('hides score events until host reveal', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      scoresRevealed: false,
      scoreEvents: [
        {
          id: 'event_1',
          partyId: 'party_1',
          teamId: 'team_1',
          roundId: null,
          actorId: 'host_1',
          label: 'Best dressed',
          delta: 100,
          source: 'BONUS',
          reason: 'Theme fit',
          createdAt: new Date(),
          team: { id: 'team_1', name: 'Red', color: '#f00' },
        },
      ],
    });

    const res = await app.inject({ method: 'GET', url: '/v1/parties/ABCDEF/score-events' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ partyId: 'party_1', scoresRevealed: false, events: [] });
  });

  it('returns revealed score events with lowercase sources', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      scoresRevealed: true,
      scoreEvents: [
        {
          id: 'event_1',
          partyId: 'party_1',
          teamId: 'team_1',
          roundId: null,
          actorId: 'host_1',
          label: 'Best dressed',
          delta: 100,
          source: 'BONUS',
          reason: 'Theme fit',
          createdAt: new Date(),
          team: { id: 'team_1', name: 'Red', color: '#f00' },
        },
      ],
    });

    const res = await app.inject({ method: 'GET', url: '/v1/parties/ABCDEF/score-events' });

    expect(res.statusCode).toBe(200);
    expect(res.json().events[0]).toMatchObject({
      label: 'Best dressed',
      delta: 100,
      source: 'bonus',
      team: { name: 'Red' },
    });
  });

  it('allows the host to award a bonus', async () => {
    mocks.party.findUnique.mockResolvedValue({ id: 'party_1', hostId: 'host_1' });
    mocks.team.findUnique.mockResolvedValue({ id: 'team_1', partyId: 'party_1' });
    mocks.scoreEvent.create.mockImplementation(async ({ data, include }) => ({
      id: 'event_1',
      ...data,
      roundId: null,
      reason: data.reason ?? null,
      createdAt: new Date(),
      team: include ? { id: 'team_1', name: 'Red', color: '#f00' } : undefined,
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/parties/ABCDEF/score-events/bonus',
      headers: { authorization: `Bearer ${hostToken}` },
      payload: { teamId: 'team_1', label: 'Most vibrant', points: 75, reason: 'Room energy' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ teamId: 'team_1', delta: 75, source: 'bonus' });
    expect(mocks.scoreEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partyId: 'party_1',
          teamId: 'team_1',
          actorId: 'host_1',
          label: 'Most vibrant',
          delta: 75,
          source: 'BONUS',
        }),
      }),
    );
  });

  it('rejects bonus awards from non-hosts', async () => {
    mocks.party.findUnique.mockResolvedValue({ id: 'party_1', hostId: 'host_1' });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/parties/ABCDEF/score-events/bonus',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { teamId: 'team_1', label: 'Most vibrant', points: 75 },
    });

    expect(res.statusCode).toBe(403);
    expect(mocks.scoreEvent.create).not.toHaveBeenCalled();
  });

  it('reveals scores for the host', async () => {
    mocks.party.findUnique.mockResolvedValue({ id: 'party_1', hostId: 'host_1' });
    mocks.party.update.mockResolvedValue({ id: 'party_1', scoresRevealed: true });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/parties/ABCDEF/reveal',
      headers: { authorization: `Bearer ${hostToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ partyId: 'party_1', scoresRevealed: true });
    expect(mocks.party.update).toHaveBeenCalledWith({
      where: { id: 'party_1' },
      data: { scoresRevealed: true },
      select: { id: true, scoresRevealed: true },
    });
  });
});

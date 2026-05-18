import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('players routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeMockPrisma>['mocks'];
  let hostToken: string;
  let aliceToken: string;
  let bobToken: string;

  beforeAll(async () => {
    const built = makeMockPrisma();
    mocks = built.mocks;
    app = await buildApp({ prisma: built.prisma, disableSockets: true });
    await app.ready();
    hostToken = app.jwt.sign({ sub: 'host_1', email: 'host@x.co' });
    aliceToken = app.jwt.sign({ sub: 'alice_1', email: 'alice@x.co' });
    bobToken = app.jwt.sign({ sub: 'bob_1', email: 'bob@x.co' });
  });

  afterAll(async () => await app.close());
  beforeEach(() => resetMocks(mocks));

  const teamFixture = (overrides: { playerCount?: number; maxPerTeam?: number; status?: string } = {}) => ({
    id: 'team_1',
    partyId: 'party_1',
    name: 'Red',
    party: {
      id: 'party_1',
      maxPerTeam: overrides.maxPerTeam ?? 10,
      status: overrides.status ?? 'LOBBY',
    },
    _count: { players: overrides.playerCount ?? 0 },
  });

  describe('POST /v1/teams/:teamId/players', () => {
    it('lets an anonymous player join', async () => {
      mocks.team.findUnique.mockResolvedValue(teamFixture());
      mocks.player.create.mockImplementation(async ({ data }) => ({
        id: 'p_1',
        joinedAt: new Date(),
        socketId: null,
        ...data,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/teams/team_1/players',
        payload: { nickname: 'Anon' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.nickname).toBe('Anon');
      expect(body.userId).toBeFalsy();
      expect(body.isCaptain).toBe(true); // first to join → captain
    });

    it('links the player to the user when a token is supplied', async () => {
      mocks.team.findUnique.mockResolvedValue(teamFixture({ playerCount: 1 }));
      mocks.player.create.mockImplementation(async ({ data }) => ({
        id: 'p_2',
        joinedAt: new Date(),
        socketId: null,
        isCaptain: false,
        ...data,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/teams/team_1/players',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { nickname: 'Alice' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().userId).toBe('alice_1');
      expect(res.json().isCaptain).toBe(false);
    });

    it('rejects when team is full', async () => {
      mocks.team.findUnique.mockResolvedValue(teamFixture({ playerCount: 10, maxPerTeam: 10 }));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/teams/team_1/players',
        payload: { nickname: 'TooLate' },
      });
      expect(res.statusCode).toBe(409);
      expect(mocks.player.create).not.toHaveBeenCalled();
    });

    it("rejects when party isn't in LOBBY", async () => {
      mocks.team.findUnique.mockResolvedValue(teamFixture({ status: 'IN_PROGRESS' }));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/teams/team_1/players',
        payload: { nickname: 'Late' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('returns 404 for an unknown team', async () => {
      mocks.team.findUnique.mockResolvedValue(null);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/teams/nope/players',
        payload: { nickname: 'X' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /v1/players/:playerId', () => {
    const playerFixture = (overrides: { userId?: string | null; hostId?: string } = {}) => ({
      id: 'p_1',
      teamId: 'team_1',
      userId: overrides.userId ?? null,
      team: { partyId: 'party_1', party: { hostId: overrides.hostId ?? 'host_1' } },
    });

    it('allows the host to remove any player', async () => {
      mocks.player.findUnique.mockResolvedValue(playerFixture({ userId: 'alice_1' }));
      mocks.player.delete.mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/players/p_1',
        headers: { authorization: `Bearer ${hostToken}` },
      });
      expect(res.statusCode).toBe(204);
      expect(mocks.player.delete).toHaveBeenCalled();
    });

    it('allows a player to remove themselves', async () => {
      mocks.player.findUnique.mockResolvedValue(playerFixture({ userId: 'alice_1' }));
      mocks.player.delete.mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/players/p_1',
        headers: { authorization: `Bearer ${aliceToken}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('forbids other players from removing someone else', async () => {
      mocks.player.findUnique.mockResolvedValue(playerFixture({ userId: 'alice_1' }));

      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/players/p_1',
        headers: { authorization: `Bearer ${bobToken}` },
      });
      expect(res.statusCode).toBe(403);
      expect(mocks.player.delete).not.toHaveBeenCalled();
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/v1/players/p_1' });
      expect(res.statusCode).toBe(401);
    });
  });
});

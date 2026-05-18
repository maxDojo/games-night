import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('parties routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeMockPrisma>['mocks'];
  let token: string;

  beforeAll(async () => {
    const built = makeMockPrisma();
    mocks = built.mocks;
    app = await buildApp({ prisma: built.prisma, disableSockets: true });
    await app.ready();
    token = app.jwt.sign({ sub: 'host_1', email: 'host@x.co' });
  });

  afterAll(async () => await app.close());
  beforeEach(() => resetMocks(mocks));

  describe('POST /v1/parties', () => {
    it('creates a party with the authed user as host', async () => {
      mocks.party.create.mockImplementation(async ({ data }) => ({
        id: 'party_123',
        name: data.name,
        hostId: data.hostId,
        joinCode: data.joinCode,
        status: 'LOBBY',
        maxTeams: data.maxTeams,
        maxPerTeam: data.maxPerTeam,
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Friday Night' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.hostId).toBe('host_1'); // pulled from JWT, not body
      expect(body.joinCode).toMatch(/^[A-Z2-9]{6}$/);
      expect(mocks.party.create).toHaveBeenCalledOnce();
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        payload: { name: 'Anon attempt' },
      });
      expect(res.statusCode).toBe(401);
      expect(mocks.party.create).not.toHaveBeenCalled();
    });

    it('honours maxTeams / maxPerTeam overrides', async () => {
      mocks.party.create.mockImplementation(async ({ data }) => ({
        id: 'p',
        name: data.name,
        hostId: data.hostId,
        joinCode: data.joinCode,
        status: 'LOBBY',
        maxTeams: data.maxTeams,
        maxPerTeam: data.maxPerTeam,
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Small', maxTeams: 4, maxPerTeam: 5 },
      });

      expect(res.statusCode).toBe(201);
      const call = mocks.party.create.mock.calls[0]![0];
      expect(call.data.maxTeams).toBe(4);
      expect(call.data.maxPerTeam).toBe(5);
    });

    it('rejects > 8 teams', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Too big', maxTeams: 9 },
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.party.create).not.toHaveBeenCalled();
    });

    it('rejects > 10 per team', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Too crowded', maxPerTeam: 11 },
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.party.create).not.toHaveBeenCalled();
    });

    it('rejects missing name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /v1/parties/:joinCode', () => {
    it('returns the party with teams and players', async () => {
      mocks.party.findUnique.mockResolvedValue({
        id: 'party_123',
        joinCode: 'ABC234',
        name: 'Friday Night',
        status: 'LOBBY',
        hostId: 'u',
        maxTeams: 8,
        maxPerTeam: 10,
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
        teams: [
          {
            id: 'team_1',
            partyId: 'party_123',
            name: 'Team A',
            color: '#ff0000',
            position: 1,
            players: [{ id: 'p1', teamId: 'team_1', nickname: 'Alice', isCaptain: true }],
          },
        ],
      });

      const res = await app.inject({ method: 'GET', url: '/v1/parties/ABC234' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.joinCode).toBe('ABC234');
      expect(body.teams).toHaveLength(1);
      expect(body.teams[0].players[0].nickname).toBe('Alice');
    });

    it('returns 404 when the party does not exist', async () => {
      mocks.party.findUnique.mockResolvedValue(null);
      const res = await app.inject({ method: 'GET', url: '/v1/parties/ZZZZZZ' });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ error: 'Party not found' });
    });

    it('rejects malformed join codes at the validator', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/parties/ABC1XY' });
      expect(res.statusCode).toBe(400);
      expect(mocks.party.findUnique).not.toHaveBeenCalled();
    });
  });
});

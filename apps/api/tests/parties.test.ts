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
        scoresRevealed: false,
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
      expect(mocks.user.update).toHaveBeenCalledWith({
        where: { id: 'host_1' },
        data: { currentPartyId: 'party_123' },
      });
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
        scoresRevealed: false,
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

    it('creates a party from an active period and copies reusable teams', async () => {
      mocks.period.findUnique.mockResolvedValue({
        id: 'period_1',
        hostId: 'host_1',
        status: 'ACTIVE',
        maxTeams: 4,
        teamCapacity: 6,
        teams: [
          { id: 'pt_1', name: 'Red', color: '#ff0000', position: 1, capacity: 5 },
          { id: 'pt_2', name: 'Blue', color: '#0000ff', position: 2, capacity: 6 },
        ],
      });
      mocks.party.create.mockImplementation(async ({ data }) => ({
        id: 'party_period',
        status: 'LOBBY',
        scoresRevealed: false,
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
        ...data,
      }));
      mocks.team.create.mockImplementation(async ({ data }) => ({ id: `team_${data.position}`, ...data }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Week Two', periodId: 'period_1' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        periodId: 'period_1',
        maxTeams: 4,
        maxPerTeam: 6,
      });
      expect(mocks.team.create).toHaveBeenCalledTimes(2);
      expect(mocks.team.create).toHaveBeenNthCalledWith(1, {
        data: {
          partyId: 'party_period',
          periodTeamId: 'pt_1',
          name: 'Red',
          color: '#ff0000',
          position: 1,
          capacity: 5,
        },
      });
    });

    it('rejects parties linked to another host period', async () => {
      mocks.period.findUnique.mockResolvedValue({
        id: 'period_1',
        hostId: 'other_host',
        status: 'ACTIVE',
        maxTeams: 4,
        teamCapacity: 6,
        teams: [],
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Not Mine', periodId: 'period_1' },
      });

      expect(res.statusCode).toBe(404);
      expect(mocks.party.create).not.toHaveBeenCalled();
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

  describe('GET /v1/parties', () => {
    const hostPartyFixture = (
      overrides: Partial<{
        id: string;
        joinCode: string;
        name: string;
        status: string;
        createdAt: Date;
        teams: Array<{ _count: { players: number } }>;
        teamCount: number;
        roundCount: number;
      }> = {},
    ) => ({
      id: overrides.id ?? 'party_123',
      joinCode: overrides.joinCode ?? 'ABC234',
      name: overrides.name ?? 'Friday Night',
      status: overrides.status ?? 'LOBBY',
      maxTeams: 4,
      maxPerTeam: 8,
      scoresRevealed: false,
      createdAt: overrides.createdAt ?? new Date('2026-06-01T18:00:00.000Z'),
      startedAt: null,
      finishedAt: null,
      _count: { teams: overrides.teamCount ?? 2, rounds: overrides.roundCount ?? 3 },
      teams: overrides.teams ?? [{ _count: { players: 3 } }, { _count: { players: 2 } }],
    });

    it('returns host-owned summaries with the explicit current party', async () => {
      mocks.user.findUnique.mockResolvedValue({ currentPartyId: 'party_older' });
      mocks.party.findMany.mockResolvedValue([
        hostPartyFixture({ id: 'party_newer', joinCode: 'NEW234', name: 'Newer Lobby' }),
        hostPartyFixture({
          id: 'party_older',
          joinCode: 'OLD234',
          name: 'Selected Party',
          status: 'IN_PROGRESS',
          teamCount: 3,
          roundCount: 5,
          teams: [{ _count: { players: 4 } }, { _count: { players: 3 } }, { _count: { players: 2 } }],
        }),
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        currentPartyId: 'party_older',
        parties: [
          { id: 'party_newer', isCurrent: false, teamCount: 2, playerCount: 5, roundCount: 3 },
          { id: 'party_older', isCurrent: true, isJoinable: true, teamCount: 3, playerCount: 9, roundCount: 5 },
        ],
      });
      expect(mocks.party.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hostId: 'host_1' }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('falls back to the newest non-terminal party for hosts without a saved selection', async () => {
      mocks.user.findUnique.mockResolvedValue({ currentPartyId: null });
      mocks.party.findMany.mockResolvedValue([
        hostPartyFixture({ id: 'finished', joinCode: 'END234', status: 'FINISHED' }),
        hostPartyFixture({ id: 'paused', joinCode: 'PAU234', status: 'PAUSED' }),
        hostPartyFixture({ id: 'older', joinCode: 'OLD234', status: 'LOBBY' }),
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/parties',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().currentPartyId).toBe('paused');
      expect(res.json().parties.find((party: { id: string }) => party.id === 'paused').isCurrent).toBe(true);
      expect(res.json().parties.find((party: { id: string }) => party.id === 'finished').isJoinable).toBe(false);
    });

    it('filters returned summaries without changing the global current party', async () => {
      mocks.user.findUnique.mockResolvedValue({ currentPartyId: 'active' });
      mocks.party.findMany.mockResolvedValue([
        hostPartyFixture({ id: 'active', joinCode: 'ACT234', status: 'IN_PROGRESS' }),
        hostPartyFixture({ id: 'finished', joinCode: 'END234', status: 'FINISHED' }),
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/parties?status=FINISHED',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        currentPartyId: 'active',
        parties: [{ id: 'finished', isCurrent: false }],
      });
    });

    it('requires host authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/parties' });

      expect(res.statusCode).toBe(401);
      expect(mocks.party.findMany).not.toHaveBeenCalled();
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
        scoresRevealed: false,
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
        host: { currentParty: { id: 'party_123', status: 'LOBBY' } },
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

    it('rejects a valid code that is no longer the host current party', async () => {
      mocks.party.findUnique.mockResolvedValue({
        id: 'party_123',
        joinCode: 'ABC234',
        name: 'Old Lobby',
        status: 'LOBBY',
        hostId: 'host_1',
        maxTeams: 8,
        maxPerTeam: 10,
        scoresRevealed: false,
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
        host: { currentParty: { id: 'party_new', status: 'LOBBY' } },
        teams: [],
      });

      const res = await app.inject({ method: 'GET', url: '/v1/parties/ABC234' });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'This is not the host current party' });
    });

    it.each([
      ['PAUSED', 'Party is paused'],
      ['FINISHED', 'Party has ended'],
      ['CANCELLED', 'Party was cancelled'],
    ])('rejects %s join codes', async (status, error) => {
      mocks.party.findUnique.mockResolvedValue({
        id: 'party_123',
        joinCode: 'ABC234',
        name: 'Closed Party',
        status,
        hostId: 'host_1',
        maxTeams: 8,
        maxPerTeam: 10,
        scoresRevealed: status === 'FINISHED',
        settings: {},
        createdAt: new Date(),
        startedAt: null,
        finishedAt: status === 'FINISHED' ? new Date() : null,
        host: { currentParty: null },
        teams: [],
      });

      const res = await app.inject({ method: 'GET', url: '/v1/parties/ABC234' });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error });
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

  describe('PUT /v1/parties/:joinCode/current', () => {
    const selectableParty = (overrides: Partial<{ hostId: string; status: string }> = {}) => ({
      id: 'party_123',
      joinCode: 'ABC234',
      name: 'Friday Night',
      status: overrides.status ?? 'LOBBY',
      hostId: overrides.hostId ?? 'host_1',
      maxTeams: 4,
      maxPerTeam: 8,
      scoresRevealed: false,
      createdAt: new Date('2026-06-01T18:00:00.000Z'),
      startedAt: null,
      finishedAt: null,
      _count: { teams: 2, rounds: 3 },
      teams: [{ _count: { players: 3 } }, { _count: { players: 2 } }],
    });

    it('sets an eligible owned party as current', async () => {
      mocks.party.findUnique.mockResolvedValue(selectableParty({ status: 'PAUSED' }));

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/parties/ABC234/current',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        currentPartyId: 'party_123',
        party: { id: 'party_123', isCurrent: true, isJoinable: false, playerCount: 5 },
      });
      expect(mocks.user.update).toHaveBeenCalledWith({
        where: { id: 'host_1' },
        data: { currentPartyId: 'party_123' },
      });
    });

    it('rejects a party owned by another host', async () => {
      mocks.party.findUnique.mockResolvedValue(selectableParty({ hostId: 'someone_else' }));

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/parties/ABC234/current',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      expect(mocks.user.update).not.toHaveBeenCalled();
    });

    it.each(['FINISHED', 'CANCELLED'])('rejects %s parties', async (status) => {
      mocks.party.findUnique.mockResolvedValue(selectableParty({ status }));

      const res = await app.inject({
        method: 'PUT',
        url: '/v1/parties/ABC234/current',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'Finished or cancelled parties cannot be current' });
      expect(mocks.user.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /v1/parties/:joinCode/settings', () => {
    const partySettingsFixture = (
      overrides: Partial<{
        hostId: string;
        maxTeams: number;
        maxPerTeam: number;
        status: string;
        teams: Array<{ _count: { players: number } }>;
      }> = {},
    ) => ({
      id: 'party_123',
      joinCode: 'ABC234',
      name: 'Friday Night',
      status: overrides.status ?? 'LOBBY',
      hostId: overrides.hostId ?? 'host_1',
      maxTeams: overrides.maxTeams ?? 8,
      maxPerTeam: overrides.maxPerTeam ?? 10,
      scoresRevealed: false,
      settings: {},
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      teams: overrides.teams ?? [],
    });

    it('updates safe settings for the host', async () => {
      mocks.party.findUnique.mockResolvedValue(
        partySettingsFixture({ teams: [{ _count: { players: 3 } }, { _count: { players: 2 } }] }),
      );
      mocks.party.update.mockResolvedValue({
        ...partySettingsFixture(),
        name: 'Saturday Night',
        maxTeams: 4,
        maxPerTeam: 6,
      });

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Saturday Night', maxTeams: 4, maxPerTeam: 6 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ name: 'Saturday Night', maxTeams: 4, maxPerTeam: 6 });
      expect(mocks.party.update).toHaveBeenCalledWith({
        where: { id: 'party_123' },
        data: { name: 'Saturday Night', maxTeams: 4, maxPerTeam: 6 },
      });
    });

    it('allows renaming a party after it has started', async () => {
      mocks.party.findUnique.mockResolvedValue(partySettingsFixture({ status: 'IN_PROGRESS' }));
      mocks.party.update.mockResolvedValue({
        ...partySettingsFixture({ status: 'IN_PROGRESS' }),
        name: 'Renamed Night',
      });

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Renamed Night' },
      });

      expect(res.statusCode).toBe(200);
      expect(mocks.party.update).toHaveBeenCalledWith({
        where: { id: 'party_123' },
        data: { name: 'Renamed Night' },
      });
    });

    it('rejects capacity changes after the party starts', async () => {
      mocks.party.findUnique.mockResolvedValue(partySettingsFixture({ status: 'IN_PROGRESS' }));

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: { maxTeams: 4 },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'Capacity settings can only be changed before the party starts' });
      expect(mocks.party.update).not.toHaveBeenCalled();
    });

    it('rejects reducing maxTeams below existing team count', async () => {
      mocks.party.findUnique.mockResolvedValue(
        partySettingsFixture({
          teams: [{ _count: { players: 0 } }, { _count: { players: 0 } }, { _count: { players: 0 } }],
        }),
      );

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: { maxTeams: 2 },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'Party already has 3 teams' });
      expect(mocks.party.update).not.toHaveBeenCalled();
    });

    it('rejects reducing maxPerTeam below existing check-ins', async () => {
      mocks.party.findUnique.mockResolvedValue(
        partySettingsFixture({ teams: [{ _count: { players: 4 } }, { _count: { players: 2 } }] }),
      );

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: { maxPerTeam: 3 },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'A team already has 4 players' });
      expect(mocks.party.update).not.toHaveBeenCalled();
    });

    it('rejects non-host users', async () => {
      mocks.party.findUnique.mockResolvedValue(partySettingsFixture({ hostId: 'someone_else' }));

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Hijacked' },
      });

      expect(res.statusCode).toBe(403);
      expect(mocks.party.update).not.toHaveBeenCalled();
    });

    it('rejects empty settings updates', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/parties/ABC234/settings',
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(mocks.party.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/parties/:joinCode/end', () => {
    it('finishes a party and reveals scores for the host', async () => {
      mocks.party.findUnique.mockResolvedValue({
        id: 'party_123',
        hostId: 'host_1',
        status: 'IN_PROGRESS',
        scoresRevealed: false,
        finishedAt: null,
      });
      mocks.round.count.mockResolvedValue(0);
      mocks.party.update.mockResolvedValue({
        id: 'party_123',
        status: 'FINISHED',
        scoresRevealed: true,
        finishedAt: new Date('2026-05-31T18:00:00.000Z'),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABC234/end',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        partyId: 'party_123',
        status: 'FINISHED',
        scoresRevealed: true,
      });
      expect(mocks.party.update).toHaveBeenCalledWith({
        where: { id: 'party_123' },
        data: expect.objectContaining({
          status: 'FINISHED',
          scoresRevealed: true,
        }),
        select: { id: true, status: true, scoresRevealed: true, finishedAt: true },
      });
      expect(mocks.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'host_1', currentPartyId: 'party_123' },
        data: { currentPartyId: null },
      });
    });

    it('rejects non-host users', async () => {
      mocks.party.findUnique.mockResolvedValue({
        id: 'party_123',
        hostId: 'someone_else',
        status: 'LOBBY',
        scoresRevealed: false,
        finishedAt: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABC234/end',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      expect(mocks.party.update).not.toHaveBeenCalled();
    });

    it('requires active rounds to be ended first', async () => {
      mocks.party.findUnique.mockResolvedValue({
        id: 'party_123',
        hostId: 'host_1',
        status: 'IN_PROGRESS',
        scoresRevealed: false,
        finishedAt: null,
      });
      mocks.round.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABC234/end',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'End the active round before ending the night' });
      expect(mocks.party.update).not.toHaveBeenCalled();
    });
  });
});

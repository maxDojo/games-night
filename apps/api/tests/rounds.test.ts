import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('rounds routes', () => {
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

  const partyFixture = (overrides: Partial<{ status: string; hostId: string; roundCount: number }> = {}) => ({
    id: 'party_1',
    joinCode: 'ABCDEF',
    name: 'Friday',
    status: overrides.status ?? 'LOBBY',
    hostId: overrides.hostId ?? 'host_1',
    maxTeams: 8,
    maxPerTeam: 10,
    settings: {},
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null,
    _count: { rounds: overrides.roundCount ?? 0 },
  });

  describe('POST /v1/parties/:joinCode/rounds', () => {
    it('creates a PENDING round merging config with game defaults + schema defaults', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture({ roundCount: 1 }));
      mocks.gameDefinition.findUnique.mockResolvedValue({
        id: 'gd_trivia',
        slug: 'trivia',
        defaultConfig: { basePoints: 100, secondsPerQuestion: 20, questionsPerRound: 10 },
      });
      mocks.round.create.mockImplementation(async ({ data }) => ({
        id: 'r_1',
        ...data,
        startedAt: null,
        endedAt: null,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { gameSlug: 'trivia', config: { secondsPerQuestion: 15 } },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.status).toBe('PENDING');
      expect(body.order).toBe(2);
      const createdConfig = mocks.round.create.mock.calls[0]![0].data.config;
      // Override applied + schema defaults filled in.
      expect(createdConfig.secondsPerQuestion).toBe(15);
      expect(createdConfig.basePoints).toBe(100);
      expect(createdConfig.questionsPerRound).toBe(10);
      expect(createdConfig.secondsPerReveal).toBe(4); // schema default
      expect(createdConfig.difficultyMin).toBe(1);
      expect(createdConfig.difficultyMax).toBe(5);
    });

    it('accepts content filters (categories + difficulty range) in config', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture());
      mocks.gameDefinition.findUnique.mockResolvedValue({
        id: 'gd_trivia',
        slug: 'trivia',
        defaultConfig: {},
      });
      mocks.round.create.mockImplementation(async ({ data }) => ({
        id: 'r_1', ...data, startedAt: null, endedAt: null,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: {
          gameSlug: 'trivia',
          config: { categories: ['Science', 'History'], difficultyMin: 2, difficultyMax: 4 },
        },
      });

      expect(res.statusCode).toBe(201);
      const stored = mocks.round.create.mock.calls[0]![0].data.config;
      expect(stored.categories).toEqual(['Science', 'History']);
      expect(stored.difficultyMin).toBe(2);
      expect(stored.difficultyMax).toBe(4);
    });

    it('rejects out-of-range config with 400 (e.g. negative secondsPerQuestion)', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture());
      mocks.gameDefinition.findUnique.mockResolvedValue({
        id: 'gd_trivia',
        slug: 'trivia',
        defaultConfig: {},
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { gameSlug: 'trivia', config: { secondsPerQuestion: -1 } },
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.round.create).not.toHaveBeenCalled();
    });

    it('rejects difficultyMin > difficultyMax with 400', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture());
      mocks.gameDefinition.findUnique.mockResolvedValue({
        id: 'gd_charades',
        slug: 'charades',
        defaultConfig: {},
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { gameSlug: 'charades', config: { difficultyMin: 5, difficultyMax: 2 } },
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.round.create).not.toHaveBeenCalled();
    });

    it('rejects unknown gameSlug', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture());
      mocks.gameDefinition.findUnique.mockResolvedValue(null);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { gameSlug: 'nope' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('rejects when party is FINISHED', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture({ status: 'FINISHED' }));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { gameSlug: 'trivia' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        payload: { gameSlug: 'trivia' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-host', async () => {
      mocks.party.findUnique.mockResolvedValue(partyFixture());
      const res = await app.inject({
        method: 'POST',
        url: '/v1/parties/ABCDEF/rounds',
        headers: { authorization: `Bearer ${otherToken}` },
        payload: { gameSlug: 'trivia' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /v1/rounds/:roundId/start', () => {
    it('moves PENDING → ACTIVE and flips party LOBBY → IN_PROGRESS', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'PENDING',
        party: { id: 'party_1', status: 'LOBBY', hostId: 'host_1', startedAt: null },
      });
      mocks.round.count.mockResolvedValue(0);
      mocks.round.update.mockImplementation(async ({ data }) => ({
        id: 'r_1',
        partyId: 'party_1',
        gameDefinitionId: 'gd',
        order: 1,
        config: {},
        endedAt: null,
        ...data,
      }));
      mocks.party.update.mockResolvedValue({});

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/start',
        headers: { authorization: `Bearer ${hostToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ACTIVE');
      // Party should have been updated to IN_PROGRESS.
      const partyCall = mocks.party.update.mock.calls[0]![0];
      expect(partyCall.data.status).toBe('IN_PROGRESS');
    });

    it('rejects if another round is already ACTIVE', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_2',
        partyId: 'party_1',
        status: 'PENDING',
        party: { id: 'party_1', status: 'IN_PROGRESS', hostId: 'host_1', startedAt: new Date() },
      });
      mocks.round.count.mockResolvedValue(1); // sibling already ACTIVE

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_2/start',
        headers: { authorization: `Bearer ${hostToken}` },
      });

      expect(res.statusCode).toBe(409);
      expect(mocks.round.update).not.toHaveBeenCalled();
    });

    it('does not flip party.status if it is already IN_PROGRESS', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_2',
        partyId: 'party_1',
        status: 'PENDING',
        party: { id: 'party_1', status: 'IN_PROGRESS', hostId: 'host_1', startedAt: new Date() },
      });
      mocks.round.count.mockResolvedValue(0);
      mocks.round.update.mockImplementation(async ({ data }) => ({
        id: 'r_2',
        partyId: 'party_1',
        gameDefinitionId: 'gd',
        order: 2,
        config: {},
        endedAt: null,
        ...data,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_2/start',
        headers: { authorization: `Bearer ${hostToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(mocks.party.update).not.toHaveBeenCalled();
    });

    it('rejects non-host', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'PENDING',
        party: { id: 'party_1', status: 'LOBBY', hostId: 'host_1', startedAt: null },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/start',
        headers: { authorization: `Bearer ${otherToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /v1/rounds/:roundId/end', () => {
    it('moves ACTIVE → COMPLETED and returns scores', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'ACTIVE',
        party: { hostId: 'host_1' },
      });
      mocks.round.update.mockImplementation(async ({ data }) => ({
        id: 'r_1',
        partyId: 'party_1',
        gameDefinitionId: 'gd',
        order: 1,
        config: {},
        startedAt: new Date(),
        ...data,
      }));
      mocks.score.findMany.mockResolvedValue([
        { id: 's1', roundId: 'r_1', teamId: 't1', points: 200, breakdown: {}, recordedAt: new Date() },
        { id: 's2', roundId: 'r_1', teamId: 't2', points: 100, breakdown: {}, recordedAt: new Date() },
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/end',
        headers: { authorization: `Bearer ${hostToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.round.status).toBe('COMPLETED');
      expect(body.scores).toHaveLength(2);
    });

    it('rejects ending a non-ACTIVE round', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'PENDING',
        party: { hostId: 'host_1' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/end',
        headers: { authorization: `Bearer ${hostToken}` },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /v1/rounds/:roundId/score', () => {
    it('upserts a score during an ACTIVE round', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'ACTIVE',
        party: { hostId: 'host_1' },
      });
      mocks.team.findUnique.mockResolvedValue({ partyId: 'party_1' });
      mocks.score.upsert.mockImplementation(async ({ create }) => ({
        id: 's_1',
        recordedAt: new Date(),
        breakdown: {},
        ...create,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/score',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { teamId: 't_1', points: 150 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().points).toBe(150);
    });

    it('rejects if team is not in the same party', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'ACTIVE',
        party: { hostId: 'host_1' },
      });
      mocks.team.findUnique.mockResolvedValue({ partyId: 'party_2' }); // different party!

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/score',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { teamId: 't_1', points: 100 },
      });
      expect(res.statusCode).toBe(404);
      expect(mocks.score.upsert).not.toHaveBeenCalled();
    });

    it('rejects scoring a non-ACTIVE round', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'COMPLETED',
        party: { hostId: 'host_1' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/score',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { teamId: 't_1', points: 100 },
      });
      expect(res.statusCode).toBe(409);
    });

    it('rejects negative points at the validator', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/score',
        headers: { authorization: `Bearer ${hostToken}` },
        payload: { teamId: 't_1', points: -50 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /v1/rounds/:roundId/skip', () => {
    it('skips a PENDING round', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'PENDING',
        party: { hostId: 'host_1' },
      });
      mocks.round.update.mockImplementation(async ({ data }) => ({
        id: 'r_1',
        partyId: 'party_1',
        gameDefinitionId: 'gd',
        order: 1,
        config: {},
        startedAt: null,
        endedAt: null,
        ...data,
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/skip',
        headers: { authorization: `Bearer ${hostToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('SKIPPED');
    });

    it('rejects skipping an ACTIVE round', async () => {
      mocks.round.findUnique.mockResolvedValue({
        id: 'r_1',
        partyId: 'party_1',
        status: 'ACTIVE',
        party: { hostId: 'host_1' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/rounds/r_1/skip',
        headers: { authorization: `Bearer ${hostToken}` },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('GET /v1/parties/:joinCode/rounds', () => {
    it('lists rounds ordered by order asc', async () => {
      mocks.party.findUnique.mockResolvedValue({
        ...partyFixture(),
        rounds: [
          {
            id: 'r1',
            partyId: 'party_1',
            gameDefinitionId: 'gd_trivia',
            gameDefinition: { id: 'gd_trivia', slug: 'trivia', name: 'Trivia', type: 'TRIVIA' },
            order: 1,
            status: 'COMPLETED',
            config: { basePoints: 100, secondsPerQuestion: 20 },
            startedAt: null,
            endedAt: null,
          },
          {
            id: 'r2',
            partyId: 'party_1',
            gameDefinitionId: 'gd_taboo',
            gameDefinition: { id: 'gd_taboo', slug: 'taboo', name: 'Taboo', type: 'TABOO' },
            order: 2,
            status: 'ACTIVE',
            config: { basePointsPerCorrect: 100, secondsPerTurn: 60 },
            startedAt: null,
            endedAt: null,
          },
        ],
      });
      const res = await app.inject({ method: 'GET', url: '/v1/parties/ABCDEF/rounds' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject([
        { gameDefinition: { slug: 'trivia', name: 'Trivia' } },
        { gameDefinition: { slug: 'taboo', name: 'Taboo' } },
      ]);
      expect(mocks.party.findUnique).toHaveBeenCalledWith({
        where: { joinCode: 'ABCDEF' },
        include: {
          rounds: {
            orderBy: { order: 'asc' },
            include: { gameDefinition: { select: { id: true, slug: true, name: true, type: true } } },
          },
        },
      });
    });
  });
});

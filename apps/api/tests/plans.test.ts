import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('plans routes', () => {
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

  const gameBySlug = (slug: string) => ({
    id: `gd_${slug}`,
    slug,
    name: slug,
    type: slug.toUpperCase(),
    description: slug,
    isBuiltIn: true,
    createdAt: new Date(),
    defaultConfig:
      slug === 'taboo'
        ? { secondsPerTurn: 60, cardsPerTurn: 20, forbiddenWordPenalty: 50 }
        : { secondsPerTurn: 60, phrasesPerTurn: 20 },
  });

  it('saves a reusable host plan with validated round configs', async () => {
    mocks.gameDefinition.findUnique.mockImplementation(async ({ where }) => gameBySlug(where.slug));
    mocks.partyPlan.create.mockImplementation(async ({ data }) => ({
      id: 'plan_1',
      hostId: data.hostId,
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.create.map((item: Record<string, unknown>) => ({
        id: `item_${item.order}`,
        planId: 'plan_1',
        ...item,
        gameDefinition: { slug: item.gameDefinitionId === 'gd_taboo' ? 'taboo' : 'charades', name: 'Game', type: 'TABOO' },
      })),
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/plans',
      headers: { authorization: `Bearer ${hostToken}` },
      payload: {
        name: 'Office Friday',
        rounds: [
          { gameSlug: 'charades', config: { secondsPerTurn: 45 } },
          { gameSlug: 'taboo', config: { forbiddenWordPenalty: 75 }, notes: 'After snacks' },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const createArg = mocks.partyPlan.create.mock.calls[0]![0];
    expect(createArg.data.hostId).toBe('host_1');
    expect(createArg.data.items.create).toHaveLength(2);
    expect(createArg.data.items.create[0].order).toBe(1);
    expect(createArg.data.items.create[0].config.secondsPerTurn).toBe(45);
    expect(createArg.data.items.create[1].config.forbiddenWordPenalty).toBe(75);
    expect(createArg.data.items.create[1].config.cardsPerTurn).toBe(20);
  });

  it('rejects unknown games when saving a plan', async () => {
    mocks.gameDefinition.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/plans',
      headers: { authorization: `Bearer ${hostToken}` },
      payload: { name: 'Bad plan', rounds: [{ gameSlug: 'nope' }] },
    });

    expect(res.statusCode).toBe(404);
    expect(mocks.partyPlan.create).not.toHaveBeenCalled();
  });

  it('replaces an existing plan owned by the host', async () => {
    mocks.partyPlan.findUnique.mockResolvedValue({ id: 'plan_1', hostId: 'host_1' });
    mocks.gameDefinition.findUnique.mockImplementation(async ({ where }) => gameBySlug(where.slug));
    mocks.partyPlanItem.deleteMany.mockResolvedValue({ count: 2 });
    mocks.partyPlan.update.mockImplementation(async ({ data }) => ({
      id: 'plan_1',
      hostId: 'host_1',
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.create.map((item: Record<string, unknown>) => ({
        id: `item_${item.order}`,
        planId: 'plan_1',
        ...item,
        gameDefinition: { slug: 'taboo', name: 'Taboo', type: 'TABOO' },
      })),
    }));

    const res = await app.inject({
      method: 'PUT',
      url: '/v1/plans/plan_1',
      headers: { authorization: `Bearer ${hostToken}` },
      payload: { name: 'Updated', rounds: [{ gameSlug: 'taboo', config: { secondsPerTurn: 30 } }] },
    });

    expect(res.statusCode).toBe(200);
    expect(mocks.partyPlanItem.deleteMany).toHaveBeenCalledWith({ where: { planId: 'plan_1' } });
    expect(mocks.partyPlan.update.mock.calls[0]![0].data.items.create[0].config.secondsPerTurn).toBe(30);
  });

  it('appends a saved plan to a party queue', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      joinCode: 'ABCDEF',
      name: 'Friday',
      status: 'LOBBY',
      hostId: 'host_1',
      maxTeams: 8,
      maxPerTeam: 10,
      settings: {},
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      _count: { rounds: 2 },
    });
    mocks.partyPlan.findUnique.mockResolvedValue({
      id: 'plan_1',
      hostId: 'host_1',
      items: [
        {
          id: 'item_1',
          planId: 'plan_1',
          gameDefinitionId: 'gd_charades',
          order: 1,
          config: { secondsPerTurn: 45 },
          notes: null,
          gameDefinition: gameBySlug('charades'),
        },
        {
          id: 'item_2',
          planId: 'plan_1',
          gameDefinitionId: 'gd_taboo',
          order: 2,
          config: { secondsPerTurn: 30 },
          notes: null,
          gameDefinition: gameBySlug('taboo'),
        },
      ],
    });
    mocks.round.create.mockImplementation(async ({ data }) => ({
      id: `r_${data.order}`,
      ...data,
      startedAt: null,
      endedAt: null,
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/parties/ABCDEF/plans/plan_1/apply',
      headers: { authorization: `Bearer ${hostToken}` },
    });

    expect(res.statusCode).toBe(201);
    expect(mocks.round.create).toHaveBeenCalledTimes(2);
    expect(mocks.round.create.mock.calls[0]![0].data.order).toBe(3);
    expect(mocks.round.create.mock.calls[1]![0].data.order).toBe(4);
    expect(res.json()).toHaveLength(2);
  });

  it('rejects applying another host’s plan', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      status: 'LOBBY',
      hostId: 'host_1',
      _count: { rounds: 0 },
    });
    mocks.partyPlan.findUnique.mockResolvedValue({ id: 'plan_1', hostId: 'other_1', items: [] });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/parties/ABCDEF/plans/plan_1/apply',
      headers: { authorization: `Bearer ${hostToken}` },
    });

    expect(res.statusCode).toBe(404);
    expect(mocks.round.create).not.toHaveBeenCalled();
  });

  it('rejects non-hosts applying a plan to a party', async () => {
    mocks.party.findUnique.mockResolvedValue({
      id: 'party_1',
      status: 'LOBBY',
      hostId: 'host_1',
      _count: { rounds: 0 },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/parties/ABCDEF/plans/plan_1/apply',
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(mocks.partyPlan.findUnique).not.toHaveBeenCalled();
  });
});

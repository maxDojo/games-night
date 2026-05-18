import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('games routes', () => {
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

  it('lists available game definitions for public client discovery', async () => {
    mocks.gameDefinition.findMany.mockResolvedValue([
      {
        id: 'gd_trivia',
        slug: 'trivia',
        name: 'Trivia',
        description: 'Answer multiple-choice questions.',
        type: 'TRIVIA',
        defaultConfig: { questionsPerRound: 10, secondsPerQuestion: 20 },
        isBuiltIn: true,
      },
      {
        id: 'gd_taboo',
        slug: 'taboo',
        name: 'Taboo',
        description: 'Describe the word without forbidden words.',
        type: 'TABOO',
        defaultConfig: { secondsPerTurn: 60, cardsPerTurn: 20 },
        isBuiltIn: true,
      },
    ]);

    const res = await app.inject({ method: 'GET', url: '/v1/games' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'gd_trivia',
        slug: 'trivia',
        name: 'Trivia',
        description: 'Answer multiple-choice questions.',
        type: 'TRIVIA',
        defaultConfig: { questionsPerRound: 10, secondsPerQuestion: 20 },
        isBuiltIn: true,
      },
      {
        id: 'gd_taboo',
        slug: 'taboo',
        name: 'Taboo',
        description: 'Describe the word without forbidden words.',
        type: 'TABOO',
        defaultConfig: { secondsPerTurn: 60, cardsPerTurn: 20 },
        isBuiltIn: true,
      },
    ]);
    expect(mocks.gameDefinition.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        type: true,
        defaultConfig: true,
        isBuiltIn: true,
      },
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
    });
  });

  it('normalizes non-object defaultConfig values to an empty object', async () => {
    mocks.gameDefinition.findMany.mockResolvedValue([
      {
        id: 'gd_custom',
        slug: 'custom',
        name: 'Custom',
        description: 'Host-defined game.',
        type: 'CUSTOM',
        defaultConfig: null,
        isBuiltIn: false,
      },
    ]);

    const res = await app.inject({ method: 'GET', url: '/v1/games' });

    expect(res.statusCode).toBe(200);
    expect(res.json()[0].defaultConfig).toEqual({});
  });
});

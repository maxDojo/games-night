import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { providers, _resetProvidersForTests } from '../src/config/providers.js';
import { makeMockPrisma } from './helpers/mockPrisma.js';

describe('error handler', () => {
  let app: FastifyInstance;
  let captureException: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    _resetProvidersForTests();
    const { prisma } = makeMockPrisma();
    app = await buildApp({ prisma, disableSockets: true });
    captureException = vi.spyOn(providers.errors, 'captureException').mockResolvedValue(undefined);
    app.get('/boom', async () => {
      throw new Error('boom');
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
    _resetProvidersForTests();
  });

  it('captures unexpected server errors through the error provider seam', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'boom' });
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          method: 'GET',
          route: '/boom',
          statusCode: 500,
        }),
        extra: expect.objectContaining({
          url: '/boom',
        }),
      }),
    );
  });
});

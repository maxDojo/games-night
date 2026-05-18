import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma } from './helpers/mockPrisma.js';

describe('health routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { prisma } = makeMockPrisma();
    app = await buildApp({ prisma, disableSockets: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });

  it('GET /v1/ready returns ready when the DB responds', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ready' });
  });
});

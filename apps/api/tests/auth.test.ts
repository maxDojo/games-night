import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('auth routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeMockPrisma>['mocks'];

  beforeAll(async () => {
    const built = makeMockPrisma();
    mocks = built.mocks;
    app = await buildApp({ prisma: built.prisma, disableSockets: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => resetMocks(mocks));

  describe('POST /v1/auth/register', () => {
    it('creates a user and returns a JWT', async () => {
      mocks.user.findUnique.mockResolvedValue(null);
      mocks.user.create.mockImplementation(async ({ data }) => ({
        id: 'u_1',
        email: data.email,
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        createdAt: new Date(),
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'a@b.co', displayName: 'Alice', password: 'hunter2hunter2' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.user.email).toBe('a@b.co');
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body.token).toMatch(/^eyJ/); // JWT-ish

      // Ensure password was hashed (not stored plaintext).
      const created = mocks.user.create.mock.calls[0]![0].data;
      expect(created.passwordHash).not.toBe('hunter2hunter2');
      expect(await argon2.verify(created.passwordHash, 'hunter2hunter2')).toBe(true);
    });

    it('returns 409 if the email is already registered', async () => {
      mocks.user.findUnique.mockResolvedValue({ id: 'existing' });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'a@b.co', displayName: 'A', password: 'hunter2hunter2' },
      });
      expect(res.statusCode).toBe(409);
      expect(mocks.user.create).not.toHaveBeenCalled();
    });

    it('rejects short passwords', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { email: 'a@b.co', displayName: 'A', password: 'short' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /v1/auth/login', () => {
    it('returns a JWT on valid credentials', async () => {
      const passwordHash = await argon2.hash('hunter2hunter2');
      mocks.user.findUnique.mockResolvedValue({
        id: 'u_1',
        email: 'a@b.co',
        displayName: 'Alice',
        passwordHash,
        createdAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'a@b.co', password: 'hunter2hunter2' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().token).toMatch(/^eyJ/);
    });

    it('returns 401 on wrong password', async () => {
      const passwordHash = await argon2.hash('hunter2hunter2');
      mocks.user.findUnique.mockResolvedValue({
        id: 'u_1',
        email: 'a@b.co',
        displayName: 'Alice',
        passwordHash,
        createdAt: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'a@b.co', password: 'wrong-wrong-wrong' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for an unknown email', async () => {
      mocks.user.findUnique.mockResolvedValue(null);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'ghost@b.co', password: 'whatever-whatever' },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});

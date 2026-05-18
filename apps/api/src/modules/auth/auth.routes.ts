import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import argon2 from 'argon2';

// ---------- JWT payload typing ----------
// Make req.user typed across the app.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

// ---------- Schemas ----------

const RegisterBody = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(128),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const UserPublic = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  createdAt: z.string().or(z.date()),
});

const AuthResponse = z.object({
  user: UserPublic,
  token: z.string(),
});

const ErrorResponse = z.object({ error: z.string() });

// ---------- Routes ----------

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new host account',
        description:
          'Creates a User and returns a JWT. The token is the same shape returned by /auth/login.',
        body: RegisterBody,
        response: { 201: AuthResponse, 409: ErrorResponse },
      },
    },
    async (req, reply) => {
      const { email, displayName, password } = req.body;
      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) return reply.code(409).send({ error: 'Email already registered' });

      const passwordHash = await argon2.hash(password);
      const user = await app.prisma.user.create({
        data: { email, displayName, passwordHash },
      });
      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        },
        token,
      });
    },
  );

  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Exchange credentials for a JWT',
        body: LoginBody,
        response: { 200: AuthResponse, 401: ErrorResponse },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await app.prisma.user.findUnique({ where: { email } });
      // Run argon2.verify even on the not-found path to mitigate user-enumeration timing leaks.
      const ok = user
        ? await argon2.verify(user.passwordHash, password)
        : await argon2
            .verify(
              '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$+++++++++++++++++++++++++++++++++++++++++++',
              password,
            )
            .catch(() => false);

      if (!user || !ok) return reply.code(401).send({ error: 'Invalid credentials' });

      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        },
        token,
      });
    },
  );
};

export default authRoutes;

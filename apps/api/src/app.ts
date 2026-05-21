import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { env } from './config/env.js';
import { providers } from './config/providers.js';
import prismaPlugin from './plugins/prisma.js';
import socketPlugin from './plugins/socket.js';
import authenticatePlugin from './plugins/authenticate.js';
import gamesPlugin from './plugins/games.js';
import healthRoutes from './modules/health/health.routes.js';
import partiesRoutes from './modules/parties/parties.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import teamsRoutes from './modules/teams/teams.routes.js';
import playersRoutes from './modules/players/players.routes.js';
import roundsRoutes from './modules/rounds/rounds.routes.js';
import plansRoutes from './modules/plans/plans.routes.js';
import gamesRoutes from './modules/games/games.routes.js';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes.js';

export interface BuildAppOptions {
  /** Inject a (possibly mocked) Prisma client. */
  prisma?: PrismaClient;
  /** Skip Socket.IO setup (for HTTP-only tests). */
  disableSockets?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Zod ⇄ Fastify: lets us declare route schemas as Zod objects and get
  // (a) runtime validation, (b) typed handlers, (c) an OpenAPI document.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security & ergonomics
  await app.register(helmet, { contentSecurityPolicy: false }); // CSP off so Swagger UI loads
  await app.register(cors, {
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
    credentials: true,
  });
  await app.register(sensible);
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_EXPIRES_IN } });

  if (env.ENABLE_SWAGGER) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Games Night API',
          description:
            'Backend API for hosting multi-team games nights (trivia, charades, taboo, custom).',
          version: '0.1.0',
        },
        servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local dev' }],
        tags: [
          { name: 'health', description: 'Liveness & readiness probes' },
          { name: 'auth', description: 'Account registration & JWT issue' },
          { name: 'parties', description: 'Party (games-night session) lifecycle' },
          { name: 'teams', description: 'Teams within a party' },
          { name: 'players', description: 'Players within a team' },
          { name: 'games', description: 'Available game definitions and defaults' },
          { name: 'rounds', description: 'Round lifecycle and manual scoring' },
          { name: 'plans', description: 'Saved host plans and round-queue templates' },
          { name: 'leaderboard', description: 'Aggregate standings across rounds' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });
  }

  // Map ZodErrors thrown from route handlers (and the validator) to 400 responses.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'ValidationError', issues: err.flatten() });
    }
    // fastify-type-provider-zod surfaces validation errors as a generic error with a `validation` array
    if ((err as { validation?: unknown }).validation) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: (err as { validation: unknown }).validation });
    }
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      void providers.errors
        .captureException(err, {
          tags: {
            method: req.method,
            route: req.routeOptions.url ?? req.url,
            statusCode,
          },
          extra: {
            url: req.url,
            requestId: req.id,
          },
        })
        .catch((captureErr) => {
          app.log.error({ err: captureErr }, 'Error provider capture failed');
        });
    }
    app.log.error(err);
    return reply.code(statusCode).send({ error: err.message });
  });

  // Infra plugins
  await app.register(prismaPlugin, { prisma: options.prisma });
  await app.register(authenticatePlugin);
  await app.register(socketPlugin, { disabled: options.disableSockets });
  await app.register(gamesPlugin);

  // Routes (v1 prefix)
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(partiesRoutes);
      await api.register(teamsRoutes);
      await api.register(playersRoutes);
      await api.register(gamesRoutes);
      await api.register(roundsRoutes);
      await api.register(plansRoutes);
      await api.register(leaderboardRoutes);
    },
    { prefix: '/v1' },
  );

  return app;
}

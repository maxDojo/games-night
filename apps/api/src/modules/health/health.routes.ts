import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const HealthResponse = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
});

const ReadyResponse = z.object({
  status: z.literal('ready'),
});

const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        description: 'Returns ok if the process is up. Does not check downstream dependencies.',
        response: { 200: HealthResponse },
      },
    },
    async () => ({ status: 'ok' as const, uptime: process.uptime() }),
  );

  app.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness probe',
        description: 'Confirms the database is reachable via a trivial SELECT.',
        response: { 200: ReadyResponse },
      },
    },
    async () => {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' as const };
    },
  );
};

export default healthRoutes;

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const GameTypeSchema = z.enum(['TRIVIA', 'CHARADES', 'TABOO', 'CUSTOM']);

const GameDefinitionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  type: GameTypeSchema,
  defaultConfig: z.record(z.string(), z.unknown()),
  isBuiltIn: z.boolean(),
});

const gamesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/games',
    {
      schema: {
        tags: ['games'],
        summary: 'List available game definitions',
        description:
          'Public catalog of games clients can queue or include in saved plans. defaultConfig is the server-seeded baseline merged with per-round overrides.',
        response: { 200: z.array(GameDefinitionSchema) },
      },
    },
    async () => {
      const games = await app.prisma.gameDefinition.findMany({
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
      return games.map((game) => ({
        ...game,
        defaultConfig: asConfigObject(game.defaultConfig),
      }));
    },
  );
};

export default gamesRoutes;

function asConfigObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

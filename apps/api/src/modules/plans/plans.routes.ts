import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { canCreateRound, mergeRoundConfig } from '../../lib/round-state.js';

const Dateish = z.string().or(z.date());

const ErrorSchema = z.object({ error: z.string() });

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
});

const PlanIdParam = z.object({ planId: z.string().min(1) });

const ApplyPlanParam = JoinCodeParam.merge(PlanIdParam);

const PlanRoundInput = z.object({
  gameSlug: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});

const SavePlanBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  rounds: z.array(PlanRoundInput).min(1).max(50),
});

const GameDefinitionSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.string(),
});

const PartyPlanItemSchema = z.object({
  id: z.string(),
  planId: z.string(),
  gameDefinitionId: z.string(),
  order: z.number(),
  config: z.unknown(),
  notes: z.string().nullable(),
  gameDefinition: GameDefinitionSummarySchema.optional(),
});

const PartyPlanSchema = z.object({
  id: z.string(),
  hostId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: Dateish,
  updatedAt: Dateish,
  items: z.array(PartyPlanItemSchema),
});

const RoundStatusSchema = z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED']);

const RoundSchema = z.object({
  id: z.string(),
  partyId: z.string(),
  gameDefinitionId: z.string(),
  order: z.number(),
  status: RoundStatusSchema,
  config: z.unknown(),
  startedAt: Dateish.nullable(),
  endedAt: Dateish.nullable(),
});

const plansRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/plans',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['plans'],
        summary: 'List saved game-night plans for the host',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(PartyPlanSchema), 401: ErrorSchema },
      },
    },
    async (req) => {
      return app.prisma.partyPlan.findMany({
        where: { hostId: req.user.sub },
        include: planInclude,
        orderBy: { updatedAt: 'desc' },
      });
    },
  );

  app.post(
    '/plans',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['plans'],
        summary: 'Save a reusable game-night plan',
        security: [{ bearerAuth: [] }],
        body: SavePlanBody,
        response: { 201: PartyPlanSchema, 400: ErrorSchema, 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const items = await buildPlanItems(app, req.body.rounds);
      const plan = await app.prisma.partyPlan.create({
        data: {
          hostId: req.user.sub,
          name: req.body.name,
          description: req.body.description ?? null,
          items: { create: items },
        },
        include: planInclude,
      });
      return reply.code(201).send(plan);
    },
  );

  app.put(
    '/plans/:planId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['plans'],
        summary: 'Replace a saved game-night plan',
        security: [{ bearerAuth: [] }],
        params: PlanIdParam,
        body: SavePlanBody,
        response: { 200: PartyPlanSchema, 400: ErrorSchema, 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req) => {
      const existing = await app.prisma.partyPlan.findUnique({
        where: { id: req.params.planId },
        select: { id: true, hostId: true },
      });
      if (!existing || existing.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Plan not found');
      }

      const items = await buildPlanItems(app, req.body.rounds);
      return app.prisma.$transaction(async (tx) => {
        await tx.partyPlanItem.deleteMany({ where: { planId: existing.id } });
        return tx.partyPlan.update({
          where: { id: existing.id },
          data: {
            name: req.body.name,
            description: req.body.description ?? null,
            items: { create: items },
          },
          include: planInclude,
        });
      });
    },
  );

  app.post(
    '/parties/:joinCode/plans/:planId/apply',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['plans'],
        summary: 'Append a saved plan to a party round queue',
        security: [{ bearerAuth: [] }],
        params: ApplyPlanParam,
        response: { 201: z.array(RoundSchema), 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { _count: { select: { rounds: true } } },
      });
      if (!party) throw app.httpErrors.notFound('Party not found');
      if (party.hostId !== req.user.sub) {
        return reply.code(403).send({ error: 'Only the host can apply plans' });
      }

      const guard = canCreateRound(party);
      if (!guard.ok) return reply.code(409).send({ error: guard.reason });

      const plan = await app.prisma.partyPlan.findUnique({
        where: { id: req.params.planId },
        include: {
          items: {
            include: { gameDefinition: true },
            orderBy: { order: 'asc' },
          },
        },
      });
      if (!plan || plan.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Plan not found');
      }
      if (plan.items.length === 0) {
        return reply.code(409).send({ error: 'Plan has no rounds to apply' });
      }

      const created = await app.prisma.$transaction(async (tx) => {
        const rounds = [];
        for (const [index, item] of plan.items.entries()) {
          const config = parseGameConfig(app, item.gameDefinition.slug, {
            ...((item.gameDefinition.defaultConfig as Record<string, unknown>) ?? {}),
            ...((item.config as Record<string, unknown>) ?? {}),
          });
          rounds.push(
            await tx.round.create({
              data: {
                partyId: party.id,
                gameDefinitionId: item.gameDefinitionId,
                order: party._count.rounds + index + 1,
                status: 'PENDING',
                config: config as Prisma.InputJsonValue,
              },
            }),
          );
        }
        return rounds;
      });

      app.broadcastPartyState(party.id).catch(() => undefined);
      return reply.code(201).send(created);
    },
  );
};

const planInclude = {
  items: {
    include: {
      gameDefinition: { select: { slug: true, name: true, type: true } },
    },
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.PartyPlanInclude;

async function buildPlanItems(
  app: FastifyInstance,
  rounds: Array<z.infer<typeof PlanRoundInput>>,
) {
  const items = [];
  for (const [index, round] of rounds.entries()) {
    const game = await app.prisma.gameDefinition.findUnique({
      where: { slug: round.gameSlug },
    });
    if (!game) throw app.httpErrors.notFound(`Unknown gameSlug: ${round.gameSlug}`);

    const merged = mergeRoundConfig(
      (game.defaultConfig as Record<string, unknown>) ?? {},
      round.config,
    );
    const config = parseGameConfig(app, round.gameSlug, merged);
    items.push({
      gameDefinitionId: game.id,
      order: index + 1,
      config: config as Prisma.InputJsonValue,
      notes: round.notes ?? null,
    });
  }
  return items;
}

function parseGameConfig(
  app: FastifyInstance,
  gameSlug: string,
  config: Record<string, unknown>,
) {
  const factory = app.games.getFactory(gameSlug);
  return factory?.configSchema ? factory.configSchema.parse(config) : config;
}

export default plansRoutes;

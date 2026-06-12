import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const Dateish = z.string().or(z.date());
const ErrorSchema = z.object({ error: z.string() });
const PeriodStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']);
const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be a #RRGGBB hex string');

const PeriodIdParam = z.object({ periodId: z.string().min(1) });
const PeriodTeamIdParam = z.object({ periodTeamId: z.string().min(1) });

const CreatePeriodBody = z.object({
  name: z.string().min(1).max(80),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  maxTeams: z.number().int().min(2).max(8).default(8),
  teamCapacity: z.number().int().min(1).max(10).default(10),
});

const UpdatePeriodBody = z
  .object({
    name: z.string().min(1).max(80).optional(),
    status: PeriodStatusSchema.optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    maxTeams: z.number().int().min(2).max(8).optional(),
    teamCapacity: z.number().int().min(1).max(10).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

const CreatePeriodTeamBody = z.object({
  name: z.string().min(1).max(40),
  color: HexColorSchema.default('#888888'),
  capacity: z.number().int().min(1).max(10).optional(),
});

const UpdatePeriodTeamBody = z
  .object({
    name: z.string().min(1).max(40).optional(),
    color: HexColorSchema.optional(),
    capacity: z.number().int().min(1).max(10).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

const PeriodTeamSchema = z.object({
  id: z.string(),
  periodId: z.string(),
  name: z.string(),
  color: z.string(),
  position: z.number().int(),
  capacity: z.number().int(),
  createdAt: Dateish,
  updatedAt: Dateish,
});

const PeriodPartySummarySchema = z.object({
  id: z.string(),
  joinCode: z.string(),
  name: z.string(),
  status: z.enum(['LOBBY', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED']),
  scoresRevealed: z.boolean(),
  createdAt: Dateish,
  startedAt: Dateish.nullable(),
  finishedAt: Dateish.nullable(),
});

const PeriodSchema = z.object({
  id: z.string(),
  hostId: z.string(),
  name: z.string(),
  status: PeriodStatusSchema,
  startsAt: Dateish.nullable(),
  endsAt: Dateish.nullable(),
  maxTeams: z.number().int(),
  teamCapacity: z.number().int(),
  settings: z.unknown(),
  createdAt: Dateish,
  updatedAt: Dateish,
});

const PeriodSummarySchema = PeriodSchema.extend({
  teamCount: z.number().int().nonnegative(),
  partyCount: z.number().int().nonnegative(),
});

const PeriodDetailSchema = PeriodSchema.extend({
  teams: z.array(PeriodTeamSchema),
  parties: z.array(PeriodPartySummarySchema),
});

const periodsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/periods',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'List persistent periods owned by the host',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(PeriodSummarySchema), 401: ErrorSchema },
      },
    },
    async (req) => {
      const periods = await app.prisma.period.findMany({
        where: { hostId: req.user.sub },
        include: { _count: { select: { teams: true, parties: true } } },
        orderBy: { updatedAt: 'desc' },
      });

      return periods.map(({ _count, ...period }) => ({
        ...period,
        teamCount: _count.teams,
        partyCount: _count.parties,
      }));
    },
  );

  app.post(
    '/periods',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'Create a persistent scoring period',
        description:
          'Creates a host-owned period that can group multiple parties and reusable team definitions.',
        security: [{ bearerAuth: [] }],
        body: CreatePeriodBody,
        response: { 201: PeriodSchema, 400: ErrorSchema, 401: ErrorSchema },
      },
    },
    async (req, reply) => {
      const dateError = validateDateRange(req.body.startsAt, req.body.endsAt);
      if (dateError) return reply.code(400).send({ error: dateError });

      const period = await app.prisma.period.create({
        data: {
          hostId: req.user.sub,
          name: req.body.name,
          startsAt: toDate(req.body.startsAt),
          endsAt: toDate(req.body.endsAt),
          maxTeams: req.body.maxTeams,
          teamCapacity: req.body.teamCapacity,
        },
      });
      return reply.code(201).send(period);
    },
  );

  app.get(
    '/periods/:periodId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'Read a persistent period',
        security: [{ bearerAuth: [] }],
        params: PeriodIdParam,
        response: { 200: PeriodDetailSchema, 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req) => {
      const period = await app.prisma.period.findUnique({
        where: { id: req.params.periodId },
        include: {
          teams: { orderBy: { position: 'asc' } },
          parties: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!period || period.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Period not found');
      }
      return period;
    },
  );

  app.patch(
    '/periods/:periodId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'Update a persistent period',
        security: [{ bearerAuth: [] }],
        params: PeriodIdParam,
        body: UpdatePeriodBody,
        response: {
          200: PeriodSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const existing = await app.prisma.period.findUnique({
        where: { id: req.params.periodId },
        include: { _count: { select: { teams: true } } },
      });
      if (!existing || existing.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Period not found');
      }

      const startsAt = req.body.startsAt === undefined ? existing.startsAt : req.body.startsAt;
      const endsAt = req.body.endsAt === undefined ? existing.endsAt : req.body.endsAt;
      const dateError = validateDateRange(startsAt, endsAt);
      if (dateError) return reply.code(400).send({ error: dateError });
      if (req.body.maxTeams !== undefined && req.body.maxTeams < existing._count.teams) {
        return reply.code(409).send({ error: `Period already has ${existing._count.teams} teams` });
      }

      return app.prisma.period.update({
        where: { id: existing.id },
        data: {
          ...req.body,
          startsAt: req.body.startsAt === undefined ? undefined : toDate(req.body.startsAt),
          endsAt: req.body.endsAt === undefined ? undefined : toDate(req.body.endsAt),
        },
      });
    },
  );

  app.post(
    '/periods/:periodId/teams',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'Create a reusable team in a period',
        security: [{ bearerAuth: [] }],
        params: PeriodIdParam,
        body: CreatePeriodTeamBody,
        response: {
          201: PeriodTeamSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const period = await app.prisma.period.findUnique({
        where: { id: req.params.periodId },
        include: {
          _count: { select: { teams: true } },
          teams: { select: { position: true } },
        },
      });
      if (!period || period.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Period not found');
      }
      if (period.status !== 'ACTIVE') {
        return reply.code(409).send({ error: 'Teams can only be added to an active period' });
      }
      if (period._count.teams >= period.maxTeams) {
        return reply.code(409).send({ error: `Period is at its max of ${period.maxTeams} teams` });
      }

      const team = await app.prisma.periodTeam.create({
        data: {
          periodId: period.id,
          name: req.body.name,
          color: req.body.color,
          capacity: req.body.capacity ?? period.teamCapacity,
          position: firstAvailablePosition(period.teams.map((team) => team.position), period.maxTeams),
        },
      });
      return reply.code(201).send(team);
    },
  );

  app.patch(
    '/period-teams/:periodTeamId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'Update a reusable period team',
        security: [{ bearerAuth: [] }],
        params: PeriodTeamIdParam,
        body: UpdatePeriodTeamBody,
        response: { 200: PeriodTeamSchema, 401: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req) => {
      const team = await app.prisma.periodTeam.findUnique({
        where: { id: req.params.periodTeamId },
        include: { period: { select: { hostId: true } } },
      });
      if (!team || team.period.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Period team not found');
      }
      return app.prisma.periodTeam.update({
        where: { id: team.id },
        data: req.body,
      });
    },
  );

  app.delete(
    '/period-teams/:periodTeamId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['periods'],
        summary: 'Delete an unused reusable period team',
        description:
          'Teams already copied into a party keep their identity link, so a used reusable team cannot be deleted.',
        security: [{ bearerAuth: [] }],
        params: PeriodTeamIdParam,
        response: {
          204: z.null(),
          401: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const team = await app.prisma.periodTeam.findUnique({
        where: { id: req.params.periodTeamId },
        include: {
          period: { select: { hostId: true } },
          _count: { select: { partyTeams: true } },
        },
      });
      if (!team || team.period.hostId !== req.user.sub) {
        throw app.httpErrors.notFound('Period team not found');
      }
      if (team._count.partyTeams > 0) {
        return reply.code(409).send({ error: 'A team already used by a party cannot be deleted' });
      }

      await app.prisma.periodTeam.delete({ where: { id: team.id } });
      return reply.code(204).send();
    },
  );
};

function toDate(value: string | Date | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

function validateDateRange(
  startsAt: string | Date | null | undefined,
  endsAt: string | Date | null | undefined,
) {
  if (!startsAt || !endsAt) return undefined;
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return 'endsAt must be after startsAt';
  }
  return undefined;
}

function firstAvailablePosition(positions: number[], maxTeams: number) {
  const used = new Set(positions);
  for (let position = 1; position <= maxTeams; position += 1) {
    if (!used.has(position)) return position;
  }
  return maxTeams + 1;
}

export default periodsRoutes;

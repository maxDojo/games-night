import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

// ---------- Schemas ----------

const PlayerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  nickname: z.string(),
  userId: z.string().nullable().optional(),
  isCaptain: z.boolean().optional(),
});

const TeamSchema = z.object({
  id: z.string(),
  partyId: z.string(),
  name: z.string(),
  color: z.string(),
  position: z.number(),
  players: z.array(PlayerSchema).optional(),
});

const ErrorSchema = z.object({ error: z.string() });

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
});

const TeamIdParam = z.object({
  teamId: z.string().min(1),
});

const CreateTeamBody = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a #RRGGBB hex string')
    .default('#888888'),
});

const UpdateTeamBody = z
  .object({
    name: z.string().min(1).max(40).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' });

// ---------- Routes ----------

const teamsRoutes: FastifyPluginAsyncZod = async (app) => {
  // List teams (public — players need this to choose a team before joining).
  app.get(
    '/parties/:joinCode/teams',
    {
      schema: {
        tags: ['teams'],
        summary: 'List teams in a party',
        params: JoinCodeParam,
        response: { 200: z.array(TeamSchema), 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { teams: { include: { players: true }, orderBy: { position: 'asc' } } },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      return party.teams;
    },
  );

  // Create a team (host only).
  app.post(
    '/parties/:joinCode/teams',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['teams'],
        summary: 'Create a team',
        description:
          'Host-only. Auto-assigns the next available position. Rejects if maxTeams has been reached.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        body: CreateTeamBody,
        response: { 201: TeamSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { _count: { select: { teams: true } } },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can create teams' });
      if (party._count.teams >= party.maxTeams)
        return reply
          .code(409)
          .send({ error: `Party is at its max of ${party.maxTeams} teams` });

      const team = await app.prisma.team.create({
        data: {
          partyId: party.id,
          name: req.body.name,
          color: req.body.color,
          position: party._count.teams + 1,
        },
      });
      app.broadcastPartyState(party.id).catch((err) =>
        app.log.error({ err }, 'party:state broadcast failed'),
      );
      return reply.code(201).send(team);
    },
  );

  // Update a team (host only).
  app.patch(
    '/teams/:teamId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['teams'],
        summary: 'Update a team',
        security: [{ bearerAuth: [] }],
        params: TeamIdParam,
        body: UpdateTeamBody,
        response: { 200: TeamSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const team = await app.prisma.team.findUnique({
        where: { id: req.params.teamId },
        include: { party: { select: { hostId: true, id: true } } },
      });
      if (!team) return reply.code(404).send({ error: 'Team not found' });
      if (team.party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can update teams' });

      const updated = await app.prisma.team.update({
        where: { id: team.id },
        data: req.body,
      });
      app.broadcastPartyState(team.party.id).catch(() => undefined);
      return updated;
    },
  );

  // Delete a team (host only).
  app.delete(
    '/teams/:teamId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['teams'],
        summary: 'Delete a team',
        description: 'Removes the team and (cascade) all its players.',
        security: [{ bearerAuth: [] }],
        params: TeamIdParam,
        response: { 204: z.null(), 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const team = await app.prisma.team.findUnique({
        where: { id: req.params.teamId },
        include: { party: { select: { hostId: true, id: true } } },
      });
      if (!team) return reply.code(404).send({ error: 'Team not found' });
      if (team.party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can delete teams' });

      await app.prisma.team.delete({ where: { id: team.id } });
      app.broadcastPartyState(team.party.id).catch(() => undefined);
      return reply.code(204).send();
    },
  );
};

export default teamsRoutes;

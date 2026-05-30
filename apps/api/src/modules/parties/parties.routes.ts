import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

// Short, unambiguous join codes (no 0/O/1/I confusion).
const makeJoinCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// ---------- Schemas ----------

const PartyStatusSchema = z.enum(['LOBBY', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED']);

const CreatePartyBody = z.object({
  name: z.string().min(1).max(80).describe('Human-readable party name shown in the lobby.'),
  maxTeams: z.number().int().min(2).max(8).default(8),
  maxPerTeam: z.number().int().min(1).max(10).default(10),
});

const PartySchema = z.object({
  id: z.string(),
  joinCode: z.string(),
  name: z.string(),
  status: PartyStatusSchema,
  hostId: z.string(),
  maxTeams: z.number(),
  maxPerTeam: z.number(),
  scoresRevealed: z.boolean(),
  settings: z.unknown(),
  createdAt: z.string().or(z.date()),
  startedAt: z.string().or(z.date()).nullable(),
  finishedAt: z.string().or(z.date()).nullable(),
});

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
  color: z.string().optional(),
  position: z.number(),
  players: z.array(PlayerSchema),
});

const PartyWithTeamsSchema = PartySchema.extend({
  teams: z.array(TeamSchema),
});

const NotFoundSchema = z.object({ error: z.string() });

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/, 'Invalid join code format'),
});

// ---------- Routes ----------

const partiesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/parties',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['parties'],
        summary: 'Create a new party',
        description:
          'Creates a games-night session in LOBBY status. The authenticated user becomes the host.',
        security: [{ bearerAuth: [] }],
        body: CreatePartyBody,
        response: { 201: PartySchema, 401: NotFoundSchema },
      },
    },
    async (req, reply) => {
      const { name, maxTeams, maxPerTeam } = req.body;
      const hostId = req.user.sub;
      const party = await app.prisma.party.create({
        data: { name, hostId, maxTeams, maxPerTeam, joinCode: makeJoinCode() },
      });
      return reply.code(201).send(party);
    },
  );

  app.get(
    '/parties/:joinCode',
    {
      schema: {
        tags: ['parties'],
        summary: 'Fetch a party by join code',
        description: 'Returns the party with all teams and their players. Public.',
        params: JoinCodeParam,
        response: { 200: PartyWithTeamsSchema, 404: NotFoundSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { teams: { include: { players: true }, orderBy: { position: 'asc' } } },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      return party;
    },
  );
};

export default partiesRoutes;

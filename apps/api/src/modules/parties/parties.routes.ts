import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PartyStatus } from '@prisma/client';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import {
  currentPartyStatuses,
  isCurrentPartyStatus,
  resolveCurrentPartyId,
} from '../../lib/current-party.js';

// Short, unambiguous join codes (no 0/O/1/I confusion).
const makeJoinCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// ---------- Schemas ----------

const PartyStatusSchema = z.enum(['LOBBY', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED']);
const CreatePartyBody = z.object({
  name: z.string().min(1).max(80).describe('Human-readable party name shown in the lobby.'),
  maxTeams: z.number().int().min(2).max(8).default(8),
  maxPerTeam: z.number().int().min(1).max(10).default(10),
});

const UpdatePartySettingsBody = z
  .object({
    name: z.string().min(1).max(80).optional(),
    maxTeams: z.number().int().min(2).max(8).optional(),
    maxPerTeam: z.number().int().min(1).max(10).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

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

const HostPartySummarySchema = PartySchema.pick({
  id: true,
  joinCode: true,
  name: true,
  status: true,
  maxTeams: true,
  maxPerTeam: true,
  scoresRevealed: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
}).extend({
  isCurrent: z.boolean(),
  isJoinable: z.boolean(),
  teamCount: z.number().int().nonnegative(),
  playerCount: z.number().int().nonnegative(),
  roundCount: z.number().int().nonnegative(),
});

const HostPartyListResponseSchema = z.object({
  currentPartyId: z.string().nullable(),
  parties: z.array(HostPartySummarySchema),
});

const CurrentPartyResponseSchema = z.object({
  currentPartyId: z.string(),
  party: HostPartySummarySchema,
});

const EndPartyResponseSchema = z.object({
  partyId: z.string(),
  status: PartyStatusSchema,
  scoresRevealed: z.boolean(),
  finishedAt: z.string().or(z.date()).nullable(),
});

const NotFoundSchema = z.object({ error: z.string() });

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/, 'Invalid join code format'),
});

const HostPartyListQuery = z.object({
  status: PartyStatusSchema.optional(),
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
      const party = await app.prisma.$transaction(async (tx) => {
        const created = await tx.party.create({
          data: { name, hostId, maxTeams, maxPerTeam, joinCode: makeJoinCode() },
        });
        await tx.user.update({
          where: { id: hostId },
          data: { currentPartyId: created.id },
        });
        return created;
      });
      return reply.code(201).send(party);
    },
  );

  app.get(
    '/parties',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['parties'],
        summary: 'List parties owned by the host',
        description:
          'Returns safe party summaries for the authenticated host. The explicit current party is used when eligible; existing hosts without a saved selection fall back to their newest non-terminal party.',
        security: [{ bearerAuth: [] }],
        querystring: HostPartyListQuery,
        response: { 200: HostPartyListResponseSchema, 401: NotFoundSchema },
      },
    },
    async (req) => {
      const hostId = req.user.sub;
      const [host, parties] = await Promise.all([
        app.prisma.user.findUnique({
          where: { id: hostId },
          select: { currentPartyId: true },
        }),
        app.prisma.party.findMany({
          where: { hostId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            joinCode: true,
            name: true,
            status: true,
            maxTeams: true,
            maxPerTeam: true,
            scoresRevealed: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
            _count: { select: { teams: true, rounds: true } },
            teams: { select: { _count: { select: { players: true } } } },
          },
        }),
      ]);

      const explicitCurrent = parties.find(
        (party) => party.id === host?.currentPartyId && isCurrentPartyStatus(party.status),
      );
      const fallbackCurrent = parties.find((party) => isCurrentPartyStatus(party.status));
      const currentPartyId = explicitCurrent?.id ?? fallbackCurrent?.id ?? null;
      const visibleParties = req.query.status
        ? parties.filter((party) => party.status === req.query.status)
        : parties;

      return {
        currentPartyId,
        parties: visibleParties.map((party) => summarizeHostParty(party, currentPartyId)),
      };
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
        response: { 200: PartyWithTeamsSchema, 404: NotFoundSchema, 409: NotFoundSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: {
          host: { select: { currentParty: { select: { id: true, status: true } } } },
          teams: { include: { players: true }, orderBy: { position: 'asc' } },
        },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.status === 'PAUSED')
        return reply.code(409).send({ error: 'Party is paused' });
      if (party.status === 'FINISHED')
        return reply.code(409).send({ error: 'Party has ended' });
      if (party.status === 'CANCELLED')
        return reply.code(409).send({ error: 'Party was cancelled' });

      const currentPartyId = await resolveCurrentPartyId(
        app.prisma,
        party.hostId,
        party.host.currentParty,
      );
      if (currentPartyId !== party.id) {
        return reply.code(409).send({ error: 'This is not the host current party' });
      }
      return party;
    },
  );

  app.put(
    '/parties/:joinCode/current',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['parties'],
        summary: 'Set the host current party',
        description:
          'Host-only. Selects the party used as the current mobile host context. Finished and cancelled parties remain inspectable but cannot become current.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        response: {
          200: CurrentPartyResponseSchema,
          401: NotFoundSchema,
          403: NotFoundSchema,
          404: NotFoundSchema,
          409: NotFoundSchema,
        },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        select: {
          id: true,
          joinCode: true,
          name: true,
          status: true,
          hostId: true,
          maxTeams: true,
          maxPerTeam: true,
          scoresRevealed: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          _count: { select: { teams: true, rounds: true } },
          teams: { select: { _count: { select: { players: true } } } },
        },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can select this party' });
      if (!isCurrentPartyStatus(party.status)) {
        return reply.code(409).send({ error: 'Finished or cancelled parties cannot be current' });
      }

      await app.prisma.user.update({
        where: { id: req.user.sub },
        data: { currentPartyId: party.id },
      });

      return {
        currentPartyId: party.id,
        party: summarizeHostParty(party, party.id),
      };
    },
  );

  app.patch(
    '/parties/:joinCode/settings',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['parties'],
        summary: 'Update party settings',
        description:
          'Host-only. Updates safe party settings. Capacity changes are allowed only while the party is in LOBBY and cannot invalidate existing teams or check-ins.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        body: UpdatePartySettingsBody,
        response: {
          200: PartySchema,
          401: NotFoundSchema,
          403: NotFoundSchema,
          404: NotFoundSchema,
          409: NotFoundSchema,
        },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { teams: { include: { _count: { select: { players: true } } } } },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can update party settings' });
      if (party.status === 'FINISHED') return reply.code(409).send({ error: 'Party is finished' });
      if (party.status === 'CANCELLED') return reply.code(409).send({ error: 'Party is cancelled' });

      const capacityChanging =
        req.body.maxTeams !== undefined || req.body.maxPerTeam !== undefined;

      if (capacityChanging && party.status !== 'LOBBY') {
        return reply
          .code(409)
          .send({ error: 'Capacity settings can only be changed before the party starts' });
      }

      if (req.body.maxTeams !== undefined && req.body.maxTeams < party.teams.length) {
        return reply
          .code(409)
          .send({ error: `Party already has ${party.teams.length} teams` });
      }

      if (req.body.maxPerTeam !== undefined) {
        const fullestTeam = party.teams.reduce(
          (max, team) => Math.max(max, team._count.players),
          0,
        );
        if (req.body.maxPerTeam < fullestTeam) {
          return reply.code(409).send({ error: `A team already has ${fullestTeam} players` });
        }
      }

      const updated = await app.prisma.party.update({
        where: { id: party.id },
        data: req.body,
      });
      app.broadcastPartyState(updated.id).catch(() => undefined);
      return updated;
    },
  );

  app.post(
    '/parties/:joinCode/end',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['parties'],
        summary: 'End a party',
        description:
          'Host-only. Marks the party as FINISHED, reveals scores, and blocks future joins or round starts. Active rounds must be ended before the night can be finished.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        response: {
          200: EndPartyResponseSchema,
          401: NotFoundSchema,
          403: NotFoundSchema,
          404: NotFoundSchema,
          409: NotFoundSchema,
        },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        select: { id: true, hostId: true, status: true, scoresRevealed: true, finishedAt: true },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can end this party' });

      if (party.status === 'CANCELLED') {
        return reply.code(409).send({ error: 'Party is cancelled' });
      }

      if (party.status !== 'FINISHED') {
        const activeRoundCount = await app.prisma.round.count({
          where: { partyId: party.id, status: 'ACTIVE' },
        });
        if (activeRoundCount > 0) {
          return reply.code(409).send({ error: 'End the active round before ending the night' });
        }
      }

      const updated = await app.prisma.$transaction(async (tx) => {
        const finished = await tx.party.update({
          where: { id: party.id },
          data: {
            status: 'FINISHED',
            scoresRevealed: true,
            finishedAt: party.finishedAt ?? new Date(),
          },
          select: { id: true, status: true, scoresRevealed: true, finishedAt: true },
        });
        await tx.user.updateMany({
          where: { id: req.user.sub, currentPartyId: party.id },
          data: { currentPartyId: null },
        });
        return finished;
      });

      app.broadcastPartyState(updated.id).catch(() => undefined);

      return {
        partyId: updated.id,
        status: updated.status,
        scoresRevealed: updated.scoresRevealed,
        finishedAt: updated.finishedAt,
      };
    },
  );
};

function summarizeHostParty<
  T extends {
    id: string;
    joinCode: string;
    name: string;
    status: PartyStatus;
    maxTeams: number;
    maxPerTeam: number;
    scoresRevealed: boolean;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    _count: { teams: number; rounds: number };
    teams: Array<{ _count: { players: number } }>;
  },
>(party: T, currentPartyId: string | null) {
  return {
    id: party.id,
    joinCode: party.joinCode,
    name: party.name,
    status: party.status,
    maxTeams: party.maxTeams,
    maxPerTeam: party.maxPerTeam,
    scoresRevealed: party.scoresRevealed,
    createdAt: party.createdAt,
    startedAt: party.startedAt,
    finishedAt: party.finishedAt,
    isCurrent: party.id === currentPartyId,
    isJoinable: party.status === 'LOBBY' || party.status === 'IN_PROGRESS',
    teamCount: party._count.teams,
    playerCount: party.teams.reduce((total, team) => total + team._count.players, 0),
    roundCount: party._count.rounds,
  };
}

export default partiesRoutes;

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
});

const AwardBonusBody = z.object({
  teamId: z.string().min(1),
  label: z.string().min(1).max(80),
  points: z.number().int().min(1).max(10000),
  reason: z.string().max(300).optional(),
});

const ScoreEventSourceSchema = z.enum(['engine', 'manual', 'correction', 'penalty', 'bonus']);

const ScoreEventSchema = z.object({
  id: z.string(),
  partyId: z.string(),
  teamId: z.string(),
  roundId: z.string().nullable(),
  actorId: z.string().nullable(),
  label: z.string(),
  delta: z.number(),
  source: ScoreEventSourceSchema,
  reason: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  team: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }).optional(),
});

const ScoreEventsResponseSchema = z.object({
  partyId: z.string(),
  scoresRevealed: z.boolean(),
  events: z.array(ScoreEventSchema),
});

const RevealResponseSchema = z.object({
  partyId: z.string(),
  scoresRevealed: z.boolean(),
});

const ErrorSchema = z.object({ error: z.string() });

const scoreEventsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/parties/:joinCode/score-events',
    {
      schema: {
        tags: ['leaderboard'],
        summary: 'List revealed score events for a party',
        description: 'Public. Events are hidden until the host reveals scores.',
        params: JoinCodeParam,
        response: { 200: ScoreEventsResponseSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: {
          scoreEvents: {
            orderBy: { createdAt: 'asc' },
            include: { team: { select: { id: true, name: true, color: true } } },
          },
        },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });

      return {
        partyId: party.id,
        scoresRevealed: party.scoresRevealed,
        events: party.scoresRevealed ? party.scoreEvents.map(mapScoreEvent) : [],
      };
    },
  );

  app.post(
    '/parties/:joinCode/score-events/bonus',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['leaderboard'],
        summary: 'Award a host bonus to a team',
        description: 'Host-only. Creates an auditable bonus score event that contributes to standings.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        body: AwardBonusBody,
        response: { 201: ScoreEventSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        select: { id: true, hostId: true },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can award bonuses' });

      const team = await app.prisma.team.findUnique({
        where: { id: req.body.teamId },
        select: { id: true, partyId: true },
      });
      if (!team || team.partyId !== party.id)
        return reply.code(404).send({ error: 'Team not found in this party' });

      const event = await app.prisma.scoreEvent.create({
        data: {
          partyId: party.id,
          teamId: team.id,
          actorId: req.user.sub,
          label: req.body.label,
          delta: req.body.points,
          source: 'BONUS',
          reason: req.body.reason,
        },
        include: { team: { select: { id: true, name: true, color: true } } },
      });

      app.emitToParty(party.id, 'score:updated', {
        teamId: event.teamId,
        delta: event.delta,
      });

      return reply.code(201).send(mapScoreEvent(event));
    },
  );

  app.post(
    '/parties/:joinCode/reveal',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['leaderboard'],
        summary: 'Reveal party scores to players',
        description: 'Host-only. Marks score reports and score events visible to player devices.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        response: { 200: RevealResponseSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        select: { id: true, hostId: true },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can reveal scores' });

      const updated = await app.prisma.party.update({
        where: { id: party.id },
        data: { scoresRevealed: true },
        select: { id: true, scoresRevealed: true },
      });

      app.broadcastPartyState(updated.id).catch(() => undefined);

      return { partyId: updated.id, scoresRevealed: updated.scoresRevealed };
    },
  );
};

function mapScoreEvent(event: {
  id: string;
  partyId: string;
  teamId: string;
  roundId: string | null;
  actorId: string | null;
  label: string;
  delta: number;
  source: string;
  reason: string | null;
  createdAt: Date;
  team?: { id: string; name: string; color: string };
}) {
  return {
    ...event,
    source: event.source.toLowerCase() as z.infer<typeof ScoreEventSourceSchema>,
  };
}

export default scoreEventsRoutes;

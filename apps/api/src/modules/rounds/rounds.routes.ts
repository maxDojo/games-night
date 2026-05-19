import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import {
  canCreateRound,
  canEndRound,
  canSkipRound,
  canStartRound,
  canWriteScore,
  mergeRoundConfig,
} from '../../lib/round-state.js';
import { QueueRoundBodySchema } from '../../games/config-contracts.js';

// ---------- Schemas ----------

const RoundStatusSchema = z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED']);

const RoundSchema = z.object({
  id: z.string(),
  partyId: z.string(),
  gameDefinitionId: z.string(),
  order: z.number(),
  status: RoundStatusSchema,
  config: z.unknown(),
  startedAt: z.string().or(z.date()).nullable(),
  endedAt: z.string().or(z.date()).nullable(),
});

const ScoreSchema = z.object({
  id: z.string(),
  roundId: z.string(),
  teamId: z.string(),
  points: z.number(),
  breakdown: z.unknown(),
  recordedAt: z.string().or(z.date()),
});

const ErrorSchema = z.object({ error: z.string() });

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
});

const RoundIdParam = z.object({ roundId: z.string().min(1) });

const WriteScoreBody = z.object({
  teamId: z.string().min(1),
  points: z.number().int().min(0),
  breakdown: z.record(z.string(), z.unknown()).optional(),
});

const RoundEndedSchema = z.object({
  round: RoundSchema,
  scores: z.array(ScoreSchema),
});

// ---------- Routes ----------

const roundsRoutes: FastifyPluginAsyncZod = async (app) => {
  // List rounds for a party (public — clients display recap).
  app.get(
    '/parties/:joinCode/rounds',
    {
      schema: {
        tags: ['rounds'],
        summary: 'List rounds in a party (ordered)',
        params: JoinCodeParam,
        response: { 200: z.array(RoundSchema), 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { rounds: { orderBy: { order: 'asc' } } },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      return party.rounds;
    },
  );

  // Queue a new round (host only). Round starts in PENDING.
  app.post(
    '/parties/:joinCode/rounds',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['rounds'],
        summary: 'Queue a new round',
        description:
          'Host-only. Resolves the GameDefinition by slug, merges defaultConfig with overrides, and creates the round in PENDING.',
        security: [{ bearerAuth: [] }],
        params: JoinCodeParam,
        body: QueueRoundBodySchema,
        response: { 201: RoundSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: { _count: { select: { rounds: true } } },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });
      if (party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can queue rounds' });

      const guard = canCreateRound(party);
      if (!guard.ok) return reply.code(409).send({ error: guard.reason });

      const game = await app.prisma.gameDefinition.findUnique({
        where: { slug: req.body.gameSlug },
      });
      if (!game) return reply.code(404).send({ error: `Unknown gameSlug: ${req.body.gameSlug}` });

      const merged = mergeRoundConfig(
        (game.defaultConfig as Record<string, unknown>) ?? {},
        req.body.config as Record<string, unknown> | undefined,
      );

      // If the game has a registered engine with a config schema, validate
      // the merged config against it. ZodError → 400 via the global error
      // handler. The parsed result has defaults filled in and is what we
      // persist, so the runner gets a known-shaped config later.
      const factory = app.games.getFactory(req.body.gameSlug);
      const config = factory?.configSchema ? factory.configSchema.parse(merged) : merged;

      const round = await app.prisma.round.create({
        data: {
          partyId: party.id,
          gameDefinitionId: game.id,
          order: party._count.rounds + 1,
          status: 'PENDING',
          config: config as Prisma.InputJsonValue,
        },
      });
      return reply.code(201).send(round);
    },
  );

  // Start a round: PENDING → ACTIVE; flip party to IN_PROGRESS (locks joins).
  app.post(
    '/rounds/:roundId/start',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['rounds'],
        summary: 'Start a round',
        description:
          'Host-only. Transitions PENDING → ACTIVE, sets startedAt, and moves the party to IN_PROGRESS (which locks new player joins). Rejects if another round in this party is already ACTIVE.',
        security: [{ bearerAuth: [] }],
        params: RoundIdParam,
        response: { 200: RoundSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const round = await app.prisma.round.findUnique({
        where: { id: req.params.roundId },
        include: { party: true },
      });
      if (!round) return reply.code(404).send({ error: 'Round not found' });
      if (round.party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can start rounds' });

      const activeCount = await app.prisma.round.count({
        where: { partyId: round.partyId, status: 'ACTIVE' },
      });
      const guard = canStartRound(round, round.party, activeCount > 0);
      if (!guard.ok) return reply.code(409).send({ error: guard.reason });

      const updated = await app.prisma.$transaction(async (tx) => {
        const r = await tx.round.update({
          where: { id: round.id },
          data: { status: 'ACTIVE', startedAt: new Date() },
        });
        if (round.party.status === 'LOBBY' || round.party.status === 'PAUSED') {
          await tx.party.update({
            where: { id: round.partyId },
            data: { status: 'IN_PROGRESS', startedAt: round.party.startedAt ?? new Date() },
          });
        }
        return r;
      });

      app.emitToParty(round.partyId, 'round:started', {
        roundId: updated.id,
        order: updated.order,
        config: updated.config,
        startedAt: updated.startedAt,
      });
      // Lobby state changed too (party.status flipped) — re-broadcast.
      app.broadcastPartyState(round.partyId).catch(() => undefined);

      // Kick off the in-memory game engine for this round, if one is
      // registered for the game's slug. If no engine is registered (or content
      // is missing), the round still runs in manual-scoring mode — the host
      // writes scores via POST /rounds/:id/score. We log the error so it
      // surfaces but don't fail the request.
      const def = await app.prisma.gameDefinition.findUnique({
        where: { id: updated.gameDefinitionId },
        select: { slug: true },
      });
      if (def && app.games.has(def.slug)) {
        app.games
          .startRound(def.slug, {
            roundId: updated.id,
            partyId: round.partyId,
            config: (updated.config as Record<string, unknown>) ?? {},
            deps: app.buildEngineDeps(),
          })
          .catch((err) => {
            app.log.error({ err, roundId: updated.id }, 'engine startRound failed');
          });
      }

      return updated;
    },
  );

  // End a round: ACTIVE → COMPLETED, return final scores.
  app.post(
    '/rounds/:roundId/end',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['rounds'],
        summary: 'End a round',
        description: 'Host-only. Transitions ACTIVE → COMPLETED, sets endedAt, returns final scores.',
        security: [{ bearerAuth: [] }],
        params: RoundIdParam,
        response: { 200: RoundEndedSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const round = await app.prisma.round.findUnique({
        where: { id: req.params.roundId },
        include: { party: { select: { hostId: true } } },
      });
      if (!round) return reply.code(404).send({ error: 'Round not found' });
      if (round.party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can end rounds' });

      const guard = canEndRound(round);
      if (!guard.ok) return reply.code(409).send({ error: guard.reason });

      // Tear down any in-memory engine runner for this round (host force-end).
      await app.games.stop(round.id);

      const ended = await app.prisma.round.update({
        where: { id: round.id },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });
      const scores = await app.prisma.score.findMany({ where: { roundId: round.id } });

      app.emitToParty(round.partyId, 'round:ended', {
        roundId: ended.id,
        scores: scores.map((s) => ({ teamId: s.teamId, points: s.points })),
      });

      return { round: ended, scores };
    },
  );

  // Skip a queued round.
  app.post(
    '/rounds/:roundId/skip',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['rounds'],
        summary: 'Skip a pending round',
        description: 'Host-only. PENDING → SKIPPED. No socket broadcast (the round never started).',
        security: [{ bearerAuth: [] }],
        params: RoundIdParam,
        response: { 200: RoundSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const round = await app.prisma.round.findUnique({
        where: { id: req.params.roundId },
        include: { party: { select: { hostId: true } } },
      });
      if (!round) return reply.code(404).send({ error: 'Round not found' });
      if (round.party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can skip rounds' });

      const guard = canSkipRound(round);
      if (!guard.ok) return reply.code(409).send({ error: guard.reason });

      return app.prisma.round.update({
        where: { id: round.id },
        data: { status: 'SKIPPED' },
      });
    },
  );

  // Manual score write. Used directly until game engines arrive; also stays
  // around as a host override mechanism (disputes, judging calls).
  app.post(
    '/rounds/:roundId/score',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['rounds'],
        summary: 'Write or overwrite a team score for this round',
        description:
          'Host-only. Upserts the Score row keyed on (roundId, teamId). Round must be ACTIVE. Used as the manual-scoring path before game engines land, and as a host override afterwards.',
        security: [{ bearerAuth: [] }],
        params: RoundIdParam,
        body: WriteScoreBody,
        response: { 200: ScoreSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const round = await app.prisma.round.findUnique({
        where: { id: req.params.roundId },
        include: { party: { select: { hostId: true } } },
      });
      if (!round) return reply.code(404).send({ error: 'Round not found' });
      if (round.party.hostId !== req.user.sub)
        return reply.code(403).send({ error: 'Only the host can write scores' });

      const guard = canWriteScore(round);
      if (!guard.ok) return reply.code(409).send({ error: guard.reason });

      // Verify the team belongs to the same party.
      const team = await app.prisma.team.findUnique({
        where: { id: req.body.teamId },
        select: { partyId: true },
      });
      if (!team || team.partyId !== round.partyId)
        return reply.code(404).send({ error: 'Team not found in this party' });

      const breakdown = (req.body.breakdown ?? {}) as Prisma.InputJsonValue;
      const score = await app.prisma.score.upsert({
        where: { roundId_teamId: { roundId: round.id, teamId: req.body.teamId } },
        update: { points: req.body.points, breakdown },
        create: {
          roundId: round.id,
          teamId: req.body.teamId,
          points: req.body.points,
          breakdown,
        },
      });

      app.emitToParty(round.partyId, 'score:updated', {
        roundId: round.id,
        teamId: score.teamId,
        points: score.points,
      });

      return score;
    },
  );
};

export default roundsRoutes;

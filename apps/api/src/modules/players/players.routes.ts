import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

// Players can join anonymously (nickname only) OR with a JWT, which links the
// Player to a User. The host's auth is *not* required to join — players just
// need the party's joinCode (implicit, since they hit /teams/:teamId/players
// only after looking the party up by code).

// ---------- Schemas ----------

const PlayerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  nickname: z.string(),
  userId: z.string().nullable().optional(),
  isCaptain: z.boolean(),
  socketId: z.string().nullable().optional(),
  joinedAt: z.string().or(z.date()),
});

const ErrorSchema = z.object({ error: z.string() });

const TeamIdParam = z.object({ teamId: z.string().min(1) });
const PlayerIdParam = z.object({ playerId: z.string().min(1) });

const JoinTeamBody = z.object({
  nickname: z.string().min(1).max(40),
});

// ---------- Routes ----------

const playersRoutes: FastifyPluginAsyncZod = async (app) => {
  // Join a team. Auth header is optional — if present, the Player is linked to that User.
  app.post(
    '/teams/:teamId/players',
    {
      schema: {
        tags: ['players'],
        summary: 'Join a team',
        description:
          'Anonymous (nickname only) by default. If a Bearer token is supplied, the player is linked to that user.',
        security: [{ bearerAuth: [] }],
        params: TeamIdParam,
        body: JoinTeamBody,
        response: { 201: PlayerSchema, 404: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (req, reply) => {
      const team = await app.prisma.team.findUnique({
        where: { id: req.params.teamId },
        include: {
          party: { select: { id: true, maxPerTeam: true, status: true } },
          _count: { select: { players: true } },
        },
      });
      if (!team) return reply.code(404).send({ error: 'Team not found' });
      if (team.party.status !== 'LOBBY')
        return reply.code(409).send({ error: 'Party is not accepting new players' });
      if (team._count.players >= team.party.maxPerTeam)
        return reply.code(409).send({ error: `Team is full (max ${team.party.maxPerTeam})` });

      // Auth is optional here — try to verify but don't fail if missing/invalid.
      let userId: string | undefined;
      try {
        await req.jwtVerify();
        userId = req.user.sub;
      } catch {
        userId = undefined;
      }

      const player = await app.prisma.player.create({
        data: {
          teamId: team.id,
          nickname: req.body.nickname,
          userId,
          // First player on the team is the captain.
          isCaptain: team._count.players === 0,
        },
      });
      app.broadcastPartyState(team.party.id).catch(() => undefined);
      return reply.code(201).send(player);
    },
  );

  // Leave / remove a player.
  // Allowed for: the player themselves (matching userId), or the party host.
  app.delete(
    '/players/:playerId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['players'],
        summary: 'Remove a player',
        description: 'The player (if authed) or the party host can remove a player.',
        security: [{ bearerAuth: [] }],
        params: PlayerIdParam,
        response: { 204: z.null(), 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const player = await app.prisma.player.findUnique({
        where: { id: req.params.playerId },
        include: { team: { select: { partyId: true, party: { select: { hostId: true } } } } },
      });
      if (!player) return reply.code(404).send({ error: 'Player not found' });

      const isSelf = player.userId && player.userId === req.user.sub;
      const isHost = player.team.party.hostId === req.user.sub;
      if (!isSelf && !isHost)
        return reply.code(403).send({ error: 'Not allowed to remove this player' });

      await app.prisma.player.delete({ where: { id: player.id } });
      app.broadcastPartyState(player.team.partyId).catch(() => undefined);
      return reply.code(204).send();
    },
  );
};

export default playersRoutes;

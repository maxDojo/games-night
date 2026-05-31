import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import {
  HostJoinPayloadSchema,
  PartyJoinPayloadSchema,
  RoundEventPayloadSchema,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from './contracts.js';

type GamesNightSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type GamesNightSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerSocketHandlers(io: GamesNightSocketServer, app: FastifyInstance) {
  async function dispatchEvent(
    socket: GamesNightSocket,
    msg: unknown,
    defaultType?: string,
  ) {
    const parsed = RoundEventPayloadSchema.safeParse(msg);
    if (!parsed.success) {
      return emitSocketError(socket, 'ValidationError', 'Invalid round event payload', parsed.error.flatten());
    }

    const { roundId, payload } = parsed.data;
    const type = parsed.data.type ?? defaultType;
    if (!type) {
      return emitSocketError(socket, 'ValidationError', 'Missing round event type');
    }

    const runner = app.games.get(roundId);
    if (!runner) return; // round has no engine (manual-scoring mode), ignore.

    if (socket.data.hostId && socket.data.hostPartyId) {
      const round = await app.prisma.round.findUnique({
        where: { id: roundId },
        select: { partyId: true },
      });
      if (!round || round.partyId !== socket.data.hostPartyId) {
        return emitSocketError(socket, 'Forbidden', 'Host cannot control this round');
      }

      const teamId = parsed.data.teamId;
      if (!teamId) {
        return emitSocketError(socket, 'ValidationError', 'Host round events require a teamId');
      }

      const team = await app.prisma.team.findFirst({
        where: { id: teamId, partyId: socket.data.hostPartyId },
        select: { id: true },
      });
      if (!team) {
        return emitSocketError(socket, 'NotFound', 'Team not found in this party');
      }

      await runner.handleEvent(type, {
        playerId: `host:${socket.data.hostId}`,
        teamId: team.id,
        payload,
      });
      return;
    }

    const player = await app.prisma.player.findFirst({
      where: { socketId: socket.id },
      select: { id: true, teamId: true },
    });
    if (!player) return emitSocketError(socket, 'NotJoined', 'Not joined to a party');

    await runner.handleEvent(type, {
      playerId: player.id,
      teamId: player.teamId,
      payload,
    });
  }

  io.on('connection', (socket) => {
    app.log.info({ socketId: socket.id }, 'socket connected');

    socket.on('party:join', async (payload) => {
      try {
        const parsed = PartyJoinPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return emitSocketError(socket, 'ValidationError', 'Invalid party join payload', parsed.error.flatten());
        }

        const { joinCode, playerId } = parsed.data;
        const party = await app.prisma.party.findUnique({ where: { joinCode } });
        if (!party) return emitSocketError(socket, 'NotFound', 'Party not found');

        socket.join(`party:${party.id}`);
        const player = await app.prisma.player.update({
          where: { id: playerId },
          data: { socketId: socket.id },
        });
        // Also join a team-scoped room so engines can emit private events
        // (e.g. the charades phrase) only to the acting team.
        socket.join(`team:${player.teamId}`);
        await app.broadcastPartyState(party.id);
      } catch (err) {
        app.log.error({ err }, 'party:join failed');
        emitSocketError(socket, 'JoinFailed', 'Could not join party');
      }
    });

    socket.on('host:join', async (payload) => {
      try {
        const parsed = HostJoinPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return emitSocketError(socket, 'ValidationError', 'Invalid host join payload', parsed.error.flatten());
        }

        const decoded = app.jwt.verify<{ sub: string }>(parsed.data.token);
        const party = await app.prisma.party.findUnique({ where: { joinCode: parsed.data.joinCode } });
        if (!party) return emitSocketError(socket, 'NotFound', 'Party not found');
        if (party.hostId !== decoded.sub) {
          return emitSocketError(socket, 'Forbidden', 'Only the host can join host controls');
        }

        socket.data.hostId = decoded.sub;
        socket.data.hostPartyId = party.id;
        socket.join(`party:${party.id}`);
        socket.join(`host:${party.id}`);
      } catch (err) {
        app.log.error({ err }, 'host:join failed');
        emitSocketError(socket, 'JoinFailed', 'Could not join host controls');
      }
    });

    socket.on('round:event', async (msg) => {
      try {
        await dispatchEvent(socket, msg);
      } catch (err) {
        app.log.error({ err }, 'round:event failed');
        emitSocketError(socket, 'EventFailed', 'Could not process event');
      }
    });

    // Back-compat: older trivia clients emit `round:answer`. Treat as type='answer'.
    socket.on('round:answer', async (msg) => {
      try {
        await dispatchEvent(socket, msg, 'answer');
      } catch (err) {
        app.log.error({ err }, 'round:answer failed');
        emitSocketError(socket, 'AnswerFailed', 'Could not process answer');
      }
    });

    socket.on('disconnect', async () => {
      app.log.info({ socketId: socket.id }, 'socket disconnected');
      await app.prisma.player
        .updateMany({ where: { socketId: socket.id }, data: { socketId: null } })
        .catch(() => undefined);
    });
  });
}

function emitSocketError(
  socket: GamesNightSocket,
  error: string,
  message: string,
  issues?: unknown,
) {
  socket.emit('error', { error, message, issues });
}

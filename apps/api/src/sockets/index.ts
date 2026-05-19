import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import {
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

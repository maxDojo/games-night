import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { FastifyInstance } from 'fastify';

// Socket events are namespaced into "rooms" — one room per Party (by joinCode).
// Clients emit `party:join` with { joinCode, playerId } and we subscribe them.
//
// Incoming (client → server):
//   party:join     { joinCode, playerId }
//   round:event    { roundId, type, payload? }
//                    type values per game:
//                      trivia:   'answer'            payload { choice: string }
//                      charades: 'correct' | 'skip'  payload (none)
//                      taboo:    'correct' | 'skip' | 'taboo'  payload (none)
//                  Backward-compat alias: `round:answer` is auto-mapped to type='answer'.
//
// Outgoing (server → clients in the party room):
//   party:state          full lobby/team state
//   round:started        { roundId, gameSlug, config }
//   round:ended          { roundId, scores }
//   score:updated        { roundId, teamId, points, delta? }
//   prompt:next          { promptId, ... game-specific ... , deadlineAt }
//   prompt:reveal        { promptId, ... game-specific ... }
//   turn:started         { teamId, deadlineAt }           ← charades / taboo
//   turn:ended           { teamId, points, correct, skips }
//   error                { message }

interface RoundEventPayload {
  roundId?: unknown;
  type?: unknown;
  payload?: unknown;
}

export function registerSocketHandlers(io: SocketIOServer, app: FastifyInstance) {
  async function dispatchEvent(socket: Socket, msg: RoundEventPayload, defaultType?: string) {
    const roundId = typeof msg?.roundId === 'string' ? msg.roundId : null;
    if (!roundId) return;
    const type = typeof msg?.type === 'string' ? msg.type : defaultType;
    if (!type) return;

    const runner = app.games.get(roundId);
    if (!runner) return; // round has no engine (manual-scoring mode), ignore.

    const player = await app.prisma.player.findFirst({
      where: { socketId: socket.id },
      select: { id: true, teamId: true },
    });
    if (!player) return socket.emit('error', { message: 'Not joined to a party' });

    await runner.handleEvent(type, {
      playerId: player.id,
      teamId: player.teamId,
      payload: msg.payload,
    });
  }

  io.on('connection', (socket: Socket) => {
    app.log.info({ socketId: socket.id }, 'socket connected');

    socket.on('party:join', async ({ joinCode, playerId }: { joinCode: string; playerId: string }) => {
      try {
        const party = await app.prisma.party.findUnique({ where: { joinCode } });
        if (!party) return socket.emit('error', { message: 'Party not found' });

        socket.join(`party:${party.id}`);
        const player = await app.prisma.player.update({
          where: { id: playerId },
          data: { socketId: socket.id },
        });
        // Also join a team-scoped room so engines can emit private events
        // (e.g. the charades phrase) only to the acting team.
        socket.join(`team:${player.teamId}`);
        socket.emit('party:state', { partyId: party.id, status: party.status });
      } catch (err) {
        app.log.error({ err }, 'party:join failed');
        socket.emit('error', { message: 'Could not join party' });
      }
    });

    socket.on('round:event', async (msg: RoundEventPayload) => {
      try {
        await dispatchEvent(socket, msg);
      } catch (err) {
        app.log.error({ err }, 'round:event failed');
        socket.emit('error', { message: 'Could not process event' });
      }
    });

    // Back-compat: older trivia clients emit `round:answer`. Treat as type='answer'.
    socket.on('round:answer', async (msg: RoundEventPayload) => {
      try {
        await dispatchEvent(socket, msg, 'answer');
      } catch (err) {
        app.log.error({ err }, 'round:answer failed');
        socket.emit('error', { message: 'Could not process answer' });
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

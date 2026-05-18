import { Server as SocketIOServer } from 'socket.io';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';
import { registerSocketHandlers } from '../sockets/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
    /**
     * Broadcast the full party state (teams + players) to every socket joined
     * to that party's room. No-op if sockets are disabled.
     */
    broadcastPartyState: (partyId: string) => Promise<void>;
    /**
     * Low-level: emit any event to every socket in the party room. Used for
     * round/score/game events. No-op if sockets are disabled.
     */
    emitToParty: (partyId: string, event: string, payload: unknown) => void;
  }
}

interface SocketPluginOpts {
  /** Skip attaching Socket.IO (used in route-only tests). */
  disabled?: boolean;
}

export default fp<SocketPluginOpts>(async (app, opts) => {
  if (opts.disabled) {
    app.decorate('broadcastPartyState', async () => undefined);
    app.decorate('emitToParty', () => undefined);
    return;
  }

  const io = new SocketIOServer(app.server, {
    path: env.SOCKET_PATH,
    cors: {
      origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
      credentials: true,
    },
  });

  app.decorate('io', io);
  registerSocketHandlers(io, app);

  app.decorate('broadcastPartyState', async (partyId: string) => {
    const party = await app.prisma.party.findUnique({
      where: { id: partyId },
      include: { teams: { include: { players: true }, orderBy: { position: 'asc' } } },
    });
    if (!party) return;
    io.to(`party:${partyId}`).emit('party:state', party);
  });

  app.decorate('emitToParty', (partyId: string, event: string, payload: unknown) => {
    io.to(`party:${partyId}`).emit(event, payload);
  });

  app.addHook('onClose', async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });
});

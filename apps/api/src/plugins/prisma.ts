import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

// Singleton Prisma client decorated onto Fastify.
// `fp()` breaks encapsulation so routes registered in sibling scopes can read `app.prisma`.
//
// Tests may pass a pre-built client (typically a mock) via `opts.prisma` so we don't
// need a live Postgres connection.
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

interface PrismaPluginOpts {
  prisma?: PrismaClient;
}

export default fp<PrismaPluginOpts>(async (app, opts) => {
  const prisma = opts.prisma ?? new PrismaClient();
  if (!opts.prisma) {
    // Only connect if we created the client ourselves — tests manage their own lifecycle.
    await prisma.$connect();
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  }
  app.decorate('prisma', prisma);
});

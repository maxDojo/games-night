import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Reusable `preHandler` that verifies the JWT and rejects with 401.
//
// Usage in routes:
//   app.post('/foo', { preHandler: [app.authenticate], schema: { ... } }, handler)
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

import fp from 'fastify-plugin';
import { GameRegistry } from '../games/registry.js';
import { triviaEngine } from '../games/trivia/runner.js';
import { charadesEngine } from '../games/charades/runner.js';
import { tabooEngine } from '../games/taboo/runner.js';
import { realClock, type EngineDeps } from '../games/types.js';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    games: GameRegistry;
    /** Build the per-runner deps using the app's prisma + emitter. */
    buildEngineDeps: () => EngineDeps;
  }
}

export default fp(async (app) => {
  const registry = new GameRegistry();
  registry.register(triviaEngine);
  registry.register(charadesEngine);
  registry.register(tabooEngine);
  app.decorate('games', registry);

  app.decorate('buildEngineDeps', () => buildDeps(app));

  app.addHook('onClose', async () => {
    // Cancel any in-flight runners on shutdown.
    const ids = Array.from(
      (registry as unknown as { runners: Map<string, unknown> }).runners.keys(),
    );
    for (const roundId of ids) await registry.stop(roundId);
  });
});

function buildDeps(app: FastifyInstance): EngineDeps {
  return {
    prisma: app.prisma,
    emit: (target, event, payload) => {
      if (target.startsWith('team:') && app.io) {
        const room = app.io.to(target) as unknown as {
          emit: (event: string, payload: unknown) => void;
        };
        room.emit(event, payload);
        return;
      }
      app.emitToParty(target, event, payload);
    },
    clock: realClock,
    // Engine signals completion → end the round in the DB and tear down.
    onCompleted: async (roundId) => {
      const round = await app.prisma.round.findUnique({ where: { id: roundId } });
      if (!round || round.status !== 'ACTIVE') {
        await app.games.stop(roundId);
        return;
      }
      const ended = await app.prisma.round.update({
        where: { id: roundId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });
      const scores = await app.prisma.score.findMany({ where: { roundId } });
      app.emitToParty(round.partyId, 'round:ended', {
        roundId: ended.id,
        scores: scores.map((s) => ({ teamId: s.teamId, points: s.points })),
      });
      await app.games.stop(roundId);
    },
  };
}

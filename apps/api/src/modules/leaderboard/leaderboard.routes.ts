import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { tallyLeaderboard } from '../../lib/round-state.js';

const JoinCodeParam = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
});

const LeaderboardEntrySchema = z.object({
  teamId: z.string(),
  name: z.string(),
  color: z.string(),
  position: z.number(),
  totalPoints: z.number(),
  roundsPlayed: z.number(),
  rank: z.number(),
});

const LeaderboardSchema = z.object({
  partyId: z.string(),
  partyStatus: z.enum(['LOBBY', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED']),
  scoresRevealed: z.boolean(),
  entries: z.array(LeaderboardEntrySchema),
});

const ErrorSchema = z.object({ error: z.string() });

const leaderboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/parties/:joinCode/leaderboard',
    {
      schema: {
        tags: ['leaderboard'],
        summary: 'Current standings for a party',
        description:
          'Returns standings only after the host reveals scores. Sums Score.points per team across all rounds, includes zero-score teams, and shares ranks for ties.',
        params: JoinCodeParam,
        response: { 200: LeaderboardSchema, 404: ErrorSchema },
      },
    },
    async (req, reply) => {
      const party = await app.prisma.party.findUnique({
        where: { joinCode: req.params.joinCode },
        include: {
          teams: { orderBy: { position: 'asc' } },
          rounds: { include: { scores: true } },
          scoreEvents: true,
        },
      });
      if (!party) return reply.code(404).send({ error: 'Party not found' });

      const allScores = party.rounds.flatMap((r) =>
        r.scores.map((s) => ({ teamId: s.teamId, points: s.points })),
      );
      const eventScores = party.scoreEvents.map((event) => ({
        teamId: event.teamId,
        points: event.delta,
        countsAsRound: false,
      }));

      const entries = party.scoresRevealed
        ? tallyLeaderboard(
            party.teams.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
              position: t.position,
            })),
            [...allScores, ...eventScores],
          )
        : [];

      return { partyId: party.id, partyStatus: party.status, scoresRevealed: party.scoresRevealed, entries };
    },
  );
};

export default leaderboardRoutes;

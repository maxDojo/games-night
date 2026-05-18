import { z } from 'zod';

// ---------------------------------------------------------------------------
// Taboo config schema
// ---------------------------------------------------------------------------

export const TabooConfigSchema = z
  .object({
    // ---- Round size / pacing ----
    secondsPerTurn: z
      .number()
      .int()
      .min(5)
      .max(300)
      .default(60)
      .describe('How long each team has to describe + guess cards, in seconds.'),
    secondsBetweenTurns: z
      .number()
      .int()
      .min(0)
      .max(60)
      .default(4)
      .describe('Pause between team turns (0 disables the gap).'),
    cardsPerTurn: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe('Max taboo cards dealt to each team for their turn. Turn ends early if exhausted.'),

    // ---- Scoring ----
    basePointsPerCorrect: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(100)
      .describe('Points awarded each time the acting team marks a card correct.'),
    skipPenalty: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(25)
      .describe('Points deducted per skip (turn total clamps at 0).'),
    forbiddenWordPenalty: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(50)
      .describe('Points deducted when an opposing team challenges a forbidden word.'),
    maxSkipsPerTurn: z
      .number()
      .int()
      .min(0)
      .max(20)
      .default(3)
      .describe('Free skips per turn before the skip button becomes a no-op.'),

    // ---- Content filters ----
    categories: z
      .array(z.string().min(1))
      .optional()
      .describe(
        'Filter to cards with at least one of these tags. Seeded tags include "office", "travel", "food", "sports", and "movies".',
      ),
    difficultyMin: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(1)
      .describe('Inclusive minimum card difficulty.'),
    difficultyMax: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(5)
      .describe('Inclusive maximum card difficulty.'),
  })
  .refine((c) => c.difficultyMin <= c.difficultyMax, {
    message: 'difficultyMin must be ≤ difficultyMax',
    path: ['difficultyMin'],
  });

export type TabooConfig = z.infer<typeof TabooConfigSchema>;

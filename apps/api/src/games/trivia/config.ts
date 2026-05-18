import { z } from 'zod';

// ---------------------------------------------------------------------------
// Trivia config schema
// ---------------------------------------------------------------------------
// Validated at POST /v1/parties/:joinCode/rounds queue time. The result —
// fully populated with defaults — is what gets stored in Round.config and
// later consumed by TriviaRoundRunner.
//
// Hosts override any subset of these via the `config` field on the request;
// missing fields fall back to either (a) the seeded GameDefinition.defaultConfig
// merged value, or (b) the schema's `.default()` as a final safety net.
// ---------------------------------------------------------------------------

export const TriviaConfigSchema = z
  .object({
    // ---- Round size / pacing ----
    questionsPerRound: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe('How many questions to ask in this round (1–50).'),
    secondsPerQuestion: z
      .number()
      .int()
      .min(5)
      .max(300)
      .default(20)
      .describe('Seconds each question stays open before auto-reveal (5–300).'),
    secondsPerReveal: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(4)
      .describe('Pause between reveal and next question, in seconds (1–30).'),

    // ---- Scoring ----
    basePoints: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(100)
      .describe('Base points awarded for a correct answer (before mult/bonuses).'),
    timeBonusMaxPct: z
      .number()
      .min(0)
      .max(2)
      .default(0.5)
      .describe('Max fractional bonus for answering fast. 0.5 = up to +50%.'),
    difficultyMultiplier: z
      .record(z.string(), z.number().min(0).max(10))
      .default({ '1': 1.0, '2': 1.25, '3': 1.5, '4': 1.75, '5': 2.0 })
      .describe('Map of difficulty (1..5) → score multiplier. Keys are strings.'),
    streakBonusEvery: z
      .number()
      .int()
      .min(2)
      .max(20)
      .default(3)
      .describe('Every Nth consecutive correct answer awards a flat streak bonus.'),
    streakBonusPoints: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(50)
      .describe('Flat bonus added on each streak milestone.'),

    // ---- Content filters ----
    categories: z
      .array(z.string().min(1))
      .optional()
      .describe(
        'Filter prompts to ones whose Prompt.tags overlap with this set. Omit/empty = no filter. ' +
          'Case-sensitive, must match seeded tag strings (e.g. "Science", "Entertainment: Film").',
      ),
    difficultyMin: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(1)
      .describe('Inclusive minimum prompt difficulty (1 = easy, 5 = expert).'),
    difficultyMax: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(5)
      .describe('Inclusive maximum prompt difficulty.'),
  })
  .refine((c) => c.difficultyMin <= c.difficultyMax, {
    message: 'difficultyMin must be ≤ difficultyMax',
    path: ['difficultyMin'],
  });

export type TriviaConfig = z.infer<typeof TriviaConfigSchema>;

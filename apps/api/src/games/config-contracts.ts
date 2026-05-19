import { z } from 'zod';

const builtInSlugs = ['trivia', 'charades', 'taboo'] as const;

const BuiltInSlugSchema = z.enum(builtInSlugs);

const GenericGameSlugSchema = z
  .string()
  .min(1)
  .refine((slug) => !isBuiltInSlug(slug), {
    message: 'Built-in game slugs must use their typed config schema.',
  });

const CategoriesSchema = z
  .array(z.string().min(1))
  .optional()
  .describe('Optional prompt/category tag filters. Omit or pass an empty array for no filter.');

const DifficultyMinSchema = z
  .number()
  .int()
  .min(1)
  .max(5)
  .optional()
  .describe('Inclusive minimum content difficulty.');

const DifficultyMaxSchema = z
  .number()
  .int()
  .min(1)
  .max(5)
  .optional()
  .describe('Inclusive maximum content difficulty.');

const DifficultyFilterSchema = {
  categories: CategoriesSchema,
  difficultyMin: DifficultyMinSchema,
  difficultyMax: DifficultyMaxSchema,
};

export const TriviaConfigOverrideSchema = z
  .object({
    questionsPerRound: z.number().int().min(1).max(50).optional(),
    secondsPerQuestion: z.number().int().min(5).max(300).optional(),
    secondsPerReveal: z.number().int().min(1).max(30).optional(),
    basePoints: z.number().int().min(1).max(10000).optional(),
    timeBonusMaxPct: z.number().min(0).max(2).optional(),
    difficultyMultiplier: z.record(z.string(), z.number().min(0).max(10)).optional(),
    streakBonusEvery: z.number().int().min(2).max(20).optional(),
    streakBonusPoints: z.number().int().min(0).max(10000).optional(),
    ...DifficultyFilterSchema,
  })
  .refine(hasValidDifficultyRange, {
    message: 'difficultyMin must be <= difficultyMax',
    path: ['difficultyMin'],
  })
  .describe('Trivia per-round config overrides. Missing fields use server defaults.');

export const CharadesConfigOverrideSchema = z
  .object({
    secondsPerTurn: z.number().int().min(5).max(300).optional(),
    secondsBetweenTurns: z.number().int().min(0).max(60).optional(),
    phrasesPerTurn: z.number().int().min(1).max(50).optional(),
    basePointsPerCorrect: z.number().int().min(1).max(10000).optional(),
    skipPenalty: z.number().int().min(0).max(10000).optional(),
    maxSkipsPerTurn: z.number().int().min(0).max(20).optional(),
    ...DifficultyFilterSchema,
  })
  .refine(hasValidDifficultyRange, {
    message: 'difficultyMin must be <= difficultyMax',
    path: ['difficultyMin'],
  })
  .describe('Charades per-round config overrides. Missing fields use server defaults.');

export const TabooConfigOverrideSchema = z
  .object({
    secondsPerTurn: z.number().int().min(5).max(300).optional(),
    secondsBetweenTurns: z.number().int().min(0).max(60).optional(),
    cardsPerTurn: z.number().int().min(1).max(50).optional(),
    basePointsPerCorrect: z.number().int().min(1).max(10000).optional(),
    skipPenalty: z.number().int().min(0).max(10000).optional(),
    forbiddenWordPenalty: z.number().int().min(0).max(10000).optional(),
    maxSkipsPerTurn: z.number().int().min(0).max(20).optional(),
    ...DifficultyFilterSchema,
  })
  .refine(hasValidDifficultyRange, {
    message: 'difficultyMin must be <= difficultyMax',
    path: ['difficultyMin'],
  })
  .describe('Taboo per-round config overrides. Missing fields use server defaults.');

const GenericConfigSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Generic config for custom or future games.');

const TriviaRoundInputSchema = z.object({
  gameSlug: z.literal('trivia'),
  config: TriviaConfigOverrideSchema.optional(),
});

const CharadesRoundInputSchema = z.object({
  gameSlug: z.literal('charades'),
  config: CharadesConfigOverrideSchema.optional(),
});

const TabooRoundInputSchema = z.object({
  gameSlug: z.literal('taboo'),
  config: TabooConfigOverrideSchema.optional(),
});

const GenericRoundInputSchema = z.object({
  gameSlug: GenericGameSlugSchema.describe('Slug of a custom or future GameDefinition.'),
  config: GenericConfigSchema,
});

export const QueueRoundBodySchema = z
  .union([
    TriviaRoundInputSchema,
    CharadesRoundInputSchema,
    TabooRoundInputSchema,
    GenericRoundInputSchema,
  ])
  .describe('Round queue request. Built-in game slugs expose typed config overrides.');

export const PlanRoundInputSchema = z.union([
  TriviaRoundInputSchema.extend({ notes: z.string().max(500).optional() }),
  CharadesRoundInputSchema.extend({ notes: z.string().max(500).optional() }),
  TabooRoundInputSchema.extend({ notes: z.string().max(500).optional() }),
  GenericRoundInputSchema.extend({ notes: z.string().max(500).optional() }),
]);

export type PlanRoundInput = z.infer<typeof PlanRoundInputSchema>;

function hasValidDifficultyRange(value: {
  difficultyMin?: number;
  difficultyMax?: number;
}) {
  if (value.difficultyMin === undefined || value.difficultyMax === undefined) return true;
  return value.difficultyMin <= value.difficultyMax;
}

function isBuiltInSlug(slug: string): slug is z.infer<typeof BuiltInSlugSchema> {
  return builtInSlugs.includes(slug as z.infer<typeof BuiltInSlugSchema>);
}

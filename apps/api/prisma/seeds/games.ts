import { PrismaClient, GameType } from '@prisma/client';

// Seed (or refresh) the built-in GameDefinitions.
// Idempotent — runs safely on every boot.
export async function seedGames(prisma: PrismaClient) {
  const games = [
    {
      type: GameType.TRIVIA,
      slug: 'trivia',
      name: 'Trivia',
      description: 'Answer multiple-choice questions. Faster correct answers score more.',
      defaultConfig: {
        questionsPerRound: 10,
        secondsPerQuestion: 20,
        secondsPerReveal: 4,
        basePoints: 100,
        timeBonusMaxPct: 0.5,
        difficultyMultiplier: { 1: 1.0, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2.0 },
        streakBonusEvery: 3,
        streakBonusPoints: 50,
      },
    },
    {
      type: GameType.CHARADES,
      slug: 'charades',
      name: 'Charades',
      description: 'Act it out — your team guesses. Score per correct guess within the timer.',
      defaultConfig: {
        secondsPerTurn: 60,
        secondsBetweenTurns: 4,
        phrasesPerTurn: 20,
        basePointsPerCorrect: 100,
        skipPenalty: 25,
        maxSkipsPerTurn: 3,
        difficultyMin: 1,
        difficultyMax: 5,
      },
    },
    {
      type: GameType.TABOO,
      slug: 'taboo',
      name: 'Taboo',
      description: 'Describe the word without saying any of the forbidden words.',
      defaultConfig: {
        secondsPerTurn: 60,
        secondsBetweenTurns: 4,
        cardsPerTurn: 20,
        basePointsPerCorrect: 100,
        forbiddenWordPenalty: 50,
        skipPenalty: 25,
        maxSkipsPerTurn: 3,
        difficultyMin: 1,
        difficultyMax: 5,
      },
    },
  ];

  for (const g of games) {
    await prisma.gameDefinition.upsert({
      where: { slug: g.slug },
      update: { defaultConfig: g.defaultConfig, description: g.description, name: g.name },
      create: { ...g, isBuiltIn: true },
    });
  }

  return games.length;
}

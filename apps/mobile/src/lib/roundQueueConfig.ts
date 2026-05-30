import type { GameDefinitionResponse, QueueRoundRequest } from '../api/client';

export type BuiltInSlug = 'trivia' | 'charades' | 'taboo';

export interface NumericConfig {
  basePoints: string;
  seconds: string;
  count: string;
}

export const builtInSlugs: BuiltInSlug[] = ['trivia', 'charades', 'taboo'];

export function isBuiltInGame(
  game: GameDefinitionResponse,
): game is GameDefinitionResponse & { slug: BuiltInSlug } {
  return builtInSlugs.includes(game.slug as BuiltInSlug);
}

export function getConfigFromDefaults(game?: GameDefinitionResponse & { slug: BuiltInSlug }): NumericConfig {
  if (!game) {
    return { basePoints: '100', seconds: '20', count: '10' };
  }

  const defaults = getDefaultConfig(game.defaultConfig);
  if (game.slug === 'trivia') {
    return {
      basePoints: getDefaultNumber(defaults, 'basePoints', 100).toString(),
      seconds: getDefaultNumber(defaults, 'secondsPerQuestion', 20).toString(),
      count: getDefaultNumber(defaults, 'questionsPerRound', 10).toString(),
    };
  }

  return {
    basePoints: getDefaultNumber(defaults, 'basePointsPerCorrect', 100).toString(),
    seconds: getDefaultNumber(defaults, 'secondsPerTurn', 60).toString(),
    count: getDefaultNumber(defaults, 'maxSkipsPerTurn', 3).toString(),
  };
}

export function buildQueueRequest(slug: BuiltInSlug, config: NumericConfig): QueueRoundRequest {
  const basePoints = toBoundedNumber(config.basePoints, 1);
  const seconds = toBoundedNumber(config.seconds, 5);
  const count = toBoundedNumber(config.count, 1);

  if (slug === 'trivia') {
    return {
      gameSlug: 'trivia',
      config: {
        basePoints,
        secondsPerQuestion: seconds,
        questionsPerRound: count,
      },
    };
  }

  if (slug === 'charades') {
    return {
      gameSlug: 'charades',
      config: {
        basePointsPerCorrect: basePoints,
        secondsPerTurn: seconds,
        maxSkipsPerTurn: count,
      },
    };
  }

  return {
    gameSlug: 'taboo',
    config: {
      basePointsPerCorrect: basePoints,
      secondsPerTurn: seconds,
      maxSkipsPerTurn: count,
    },
  };
}

export function isValidConfig(config: NumericConfig) {
  return (
    toBoundedNumber(config.basePoints, 0) > 0 &&
    toBoundedNumber(config.seconds, 0) >= 5 &&
    toBoundedNumber(config.count, 0) > 0
  );
}

function toBoundedNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDefaultConfig(config: unknown) {
  return config && typeof config === 'object' && !Array.isArray(config) ? (config as Record<string, unknown>) : {};
}

function getDefaultNumber(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

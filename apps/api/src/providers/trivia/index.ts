import type { TriviaProvider } from './types.js';
import { createOpenTriviaDbProvider } from './open-trivia-db.js';
import { createNoneTriviaProvider } from './none.js';

export type TriviaProviderKind = 'open-trivia-db' | 'none';

export function createTriviaProvider(kind: TriviaProviderKind): TriviaProvider {
  switch (kind) {
    case 'open-trivia-db':
      return createOpenTriviaDbProvider();
    case 'none':
      return createNoneTriviaProvider();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown trivia provider: ${_exhaustive as string}`);
    }
  }
}

export type { TriviaProvider, TriviaQuestion, TriviaDifficulty } from './types.js';

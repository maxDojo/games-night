import type { TriviaProvider } from './types.js';

// Fallback when no trivia provider is configured. Lets seed/build paths run
// without requiring network access; will surface a clear error if anyone
// actually tries to fetch.
export function createNoneTriviaProvider(): TriviaProvider {
  return {
    name: 'none',
    enabled: false,
    async fetchQuestions() {
      throw new Error(
        "Trivia provider is set to 'none'. Set TRIVIA_PROVIDER=open-trivia-db (or another configured impl) to fetch questions.",
      );
    },
  };
}

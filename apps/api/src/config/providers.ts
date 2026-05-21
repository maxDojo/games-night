// Single source of truth for which external providers the app uses.
//
// Every external dependency (content sources, AI generation, push, email,
// storage, error tracking) is reached through this object. To switch from a
// free option to a paid one, edit the env var(s) — no code changes elsewhere.
//
// Adding a new provider domain (e.g. `email`, `push`):
//   1. Add `src/providers/<domain>/{types,impl-a,impl-b,index}.ts`
//   2. Add the env var to `src/config/env.ts`
//   3. Register it in the `providers` factory below
//   4. Document it in README §Providers
//
// Providers are constructed lazily on first access so that scripts/tests
// that never touch a given provider don't pay its setup cost (or, in the
// 'none'/'disabled' case, even import the implementation module).

import { env } from './env.js';
import { createTriviaProvider, type TriviaProvider } from '../providers/trivia/index.js';
import { createAIProvider, type AIProvider } from '../providers/ai/index.js';
import { createErrorProvider, type ErrorProvider } from '../providers/errors/index.js';

let triviaSingleton: TriviaProvider | undefined;
let aiSingleton: AIProvider | undefined;
let errorSingleton: ErrorProvider | undefined;

export const providers = {
  get trivia(): TriviaProvider {
    if (!triviaSingleton) triviaSingleton = createTriviaProvider(env.TRIVIA_PROVIDER);
    return triviaSingleton;
  },
  get ai(): AIProvider {
    if (!aiSingleton) aiSingleton = createAIProvider(env.AI_PROVIDER);
    return aiSingleton;
  },
  get errors(): ErrorProvider {
    if (!errorSingleton) errorSingleton = createErrorProvider(env.ERROR_PROVIDER);
    return errorSingleton;
  },
};

/** For tests: wipe singletons so an env change takes effect on next access. */
export function _resetProvidersForTests() {
  triviaSingleton = undefined;
  aiSingleton = undefined;
  errorSingleton = undefined;
}

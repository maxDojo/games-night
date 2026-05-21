// Re-exports so consumers can `import { providers } from '@/config/providers.js'`
// and reach the right types without deep paths.
export { createTriviaProvider } from './trivia/index.js';
export type { TriviaProvider, TriviaProviderKind, TriviaQuestion, TriviaDifficulty } from './trivia/index.js';
export { createAIProvider } from './ai/index.js';
export type { AIProvider, AIProviderKind, CharadesPhrase, TabooCard, AIGenerationOptions } from './ai/index.js';
export { createErrorProvider } from './errors/index.js';
export type { ErrorProvider, ErrorProviderKind, ErrorCaptureContext } from './errors/index.js';

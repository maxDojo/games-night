import type { AIProvider } from './types.js';

// Default implementation. AI generation is OFF until a real provider
// (anthropic / openai / ollama / etc.) is wired in and selected via env.
//
// Calling any method throws a clear error rather than failing silently —
// the assumption is that anyone calling these in code has *intended* to use
// AI and should see a loud failure if the project isn't configured for it.
function disabled(): never {
  throw new Error(
    "AI provider is disabled. To enable: implement a provider under src/providers/ai/, " +
      'register it in src/providers/ai/index.ts, and set AI_PROVIDER in your env.',
  );
}

export function createDisabledAIProvider(): AIProvider {
  return {
    name: 'disabled',
    enabled: false,
    generateTriviaQuestions: async () => disabled(),
    generateCharadesPhrases: async () => disabled(),
    generateTabooCards: async () => disabled(),
  };
}

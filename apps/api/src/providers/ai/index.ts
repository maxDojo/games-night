import type { AIProvider } from './types.js';
import { createDisabledAIProvider } from './disabled.js';

// Add new kinds here as implementations land:
//   | 'anthropic' | 'openai' | 'ollama'
export type AIProviderKind = 'disabled';

export function createAIProvider(kind: AIProviderKind): AIProvider {
  switch (kind) {
    case 'disabled':
      return createDisabledAIProvider();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown AI provider: ${_exhaustive as string}`);
    }
  }
}

export type { AIProvider, CharadesPhrase, TabooCard, AIGenerationOptions } from './types.js';

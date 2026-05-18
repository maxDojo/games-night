// Provider-agnostic shapes for AI-generated content.
// Future implementations (Anthropic, OpenAI, Ollama) live alongside `disabled.ts`
// and are selected via `AI_PROVIDER` in env.

import type { TriviaQuestion } from '../trivia/types.js';

export interface CharadesPhrase {
  phrase: string;
  category?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface TabooCard {
  word: string;
  /** 4–5 plausible synonyms the describer must avoid. */
  forbidden: string[];
  category?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface AIGenerationOptions {
  count: number;
  /** Free-text theme; e.g. "90s movies", "office life", "Premier League". */
  theme?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly enabled: boolean;
  generateTriviaQuestions(opts: AIGenerationOptions): Promise<TriviaQuestion[]>;
  generateCharadesPhrases(opts: AIGenerationOptions): Promise<CharadesPhrase[]>;
  generateTabooCards(opts: AIGenerationOptions): Promise<TabooCard[]>;
}

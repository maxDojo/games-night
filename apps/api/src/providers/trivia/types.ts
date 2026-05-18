// Provider-agnostic trivia question shape. Each provider transforms its native
// response into this so consumers (seed scripts, runtime game engines) never
// see provider-specific quirks.

export type TriviaDifficulty = 'easy' | 'medium' | 'hard';

export interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  /** Wrong answers; 3 for multiple-choice, 1 for true/false. */
  incorrectAnswers: string[];
  category?: string;
  /** Normalised 1..5 (easy=1, medium=3, hard=5). */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface FetchQuestionsOptions {
  difficulty?: TriviaDifficulty;
  /** Optional provider-specific category id or slug. */
  category?: string | number;
}

export interface TriviaProvider {
  readonly name: string;
  /** Whether the provider is configured and ready to use. */
  readonly enabled: boolean;
  fetchQuestions(count: number, opts?: FetchQuestionsOptions): Promise<TriviaQuestion[]>;
}

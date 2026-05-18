import { describe, it, expect } from 'vitest';
import { TriviaConfigSchema } from '../../src/games/trivia/config.js';

describe('TriviaConfigSchema', () => {
  it('parses an empty object by filling in every default', () => {
    const parsed = TriviaConfigSchema.parse({});
    expect(parsed.questionsPerRound).toBe(10);
    expect(parsed.secondsPerQuestion).toBe(20);
    expect(parsed.secondsPerReveal).toBe(4);
    expect(parsed.basePoints).toBe(100);
    expect(parsed.timeBonusMaxPct).toBe(0.5);
    expect(parsed.difficultyMin).toBe(1);
    expect(parsed.difficultyMax).toBe(5);
    expect(parsed.streakBonusEvery).toBe(3);
    expect(parsed.streakBonusPoints).toBe(50);
    // Categories is genuinely optional.
    expect(parsed.categories).toBeUndefined();
  });

  it('accepts host overrides and merges them on top of defaults', () => {
    const parsed = TriviaConfigSchema.parse({
      questionsPerRound: 5,
      secondsPerQuestion: 30,
      categories: ['Science', 'History'],
      difficultyMin: 2,
      difficultyMax: 4,
    });
    expect(parsed.questionsPerRound).toBe(5);
    expect(parsed.secondsPerQuestion).toBe(30);
    expect(parsed.categories).toEqual(['Science', 'History']);
    expect(parsed.difficultyMin).toBe(2);
    expect(parsed.difficultyMax).toBe(4);
    // Untouched fields retain their defaults.
    expect(parsed.secondsPerReveal).toBe(4);
  });

  it('rejects out-of-range values', () => {
    expect(() => TriviaConfigSchema.parse({ questionsPerRound: 0 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ questionsPerRound: 51 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ secondsPerQuestion: 4 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ secondsPerQuestion: 301 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ timeBonusMaxPct: -0.1 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ timeBonusMaxPct: 2.1 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ difficultyMin: 0 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ difficultyMax: 6 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ streakBonusEvery: 1 })).toThrow();
  });

  it('rejects difficultyMin > difficultyMax', () => {
    expect(() => TriviaConfigSchema.parse({ difficultyMin: 4, difficultyMax: 2 })).toThrow(
      /difficultyMin must be ≤ difficultyMax/,
    );
  });

  it('rejects non-integer counts', () => {
    expect(() => TriviaConfigSchema.parse({ questionsPerRound: 5.5 })).toThrow();
    expect(() => TriviaConfigSchema.parse({ secondsPerQuestion: 20.1 })).toThrow();
  });

  it('treats an empty categories array as "no filter" (allowed shape)', () => {
    // Schema allows []; the factory branches on .length to decide whether to apply hasSome.
    const parsed = TriviaConfigSchema.parse({ categories: [] });
    expect(parsed.categories).toEqual([]);
  });

  it('rejects empty category strings', () => {
    expect(() => TriviaConfigSchema.parse({ categories: [''] })).toThrow();
  });
});

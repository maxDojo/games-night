import { describe, expect, it } from 'vitest';
import { TabooConfigSchema } from '../../src/games/taboo/config.js';

describe('TabooConfigSchema', () => {
  it('fills defaults', () => {
    const parsed = TabooConfigSchema.parse({});
    expect(parsed.secondsPerTurn).toBe(60);
    expect(parsed.secondsBetweenTurns).toBe(4);
    expect(parsed.cardsPerTurn).toBe(20);
    expect(parsed.basePointsPerCorrect).toBe(100);
    expect(parsed.skipPenalty).toBe(25);
    expect(parsed.forbiddenWordPenalty).toBe(50);
    expect(parsed.maxSkipsPerTurn).toBe(3);
    expect(parsed.difficultyMin).toBe(1);
    expect(parsed.difficultyMax).toBe(5);
  });

  it('accepts content filters', () => {
    const parsed = TabooConfigSchema.parse({
      categories: ['office', 'movies'],
      difficultyMin: 2,
      difficultyMax: 4,
    });
    expect(parsed.categories).toEqual(['office', 'movies']);
    expect(parsed.difficultyMin).toBe(2);
    expect(parsed.difficultyMax).toBe(4);
  });

  it('rejects an inverted difficulty range', () => {
    expect(() => TabooConfigSchema.parse({ difficultyMin: 5, difficultyMax: 2 })).toThrow();
  });

  it('rejects unsafe pacing values', () => {
    expect(() => TabooConfigSchema.parse({ secondsPerTurn: 1 })).toThrow();
    expect(() => TabooConfigSchema.parse({ cardsPerTurn: 0 })).toThrow();
  });
});

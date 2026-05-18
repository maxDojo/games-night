import { describe, it, expect } from 'vitest';
import { CharadesConfigSchema } from '../../src/games/charades/config.js';

describe('CharadesConfigSchema', () => {
  it('fills in defaults from an empty input', () => {
    const c = CharadesConfigSchema.parse({});
    expect(c.secondsPerTurn).toBe(60);
    expect(c.secondsBetweenTurns).toBe(4);
    expect(c.phrasesPerTurn).toBe(20);
    expect(c.basePointsPerCorrect).toBe(100);
    expect(c.skipPenalty).toBe(25);
    expect(c.maxSkipsPerTurn).toBe(3);
    expect(c.difficultyMin).toBe(1);
    expect(c.difficultyMax).toBe(5);
    expect(c.categories).toBeUndefined();
  });

  it('accepts overrides', () => {
    const c = CharadesConfigSchema.parse({
      secondsPerTurn: 30,
      secondsBetweenTurns: 1,
      phrasesPerTurn: 8,
      maxSkipsPerTurn: 1,
      categories: ['movies', 'animals'],
    });
    expect(c.secondsPerTurn).toBe(30);
    expect(c.secondsBetweenTurns).toBe(1);
    expect(c.phrasesPerTurn).toBe(8);
    expect(c.maxSkipsPerTurn).toBe(1);
    expect(c.categories).toEqual(['movies', 'animals']);
  });

  it('rejects out-of-range values', () => {
    expect(() => CharadesConfigSchema.parse({ secondsPerTurn: 4 })).toThrow();
    expect(() => CharadesConfigSchema.parse({ secondsPerTurn: 301 })).toThrow();
    expect(() => CharadesConfigSchema.parse({ phrasesPerTurn: 0 })).toThrow();
    expect(() => CharadesConfigSchema.parse({ skipPenalty: -1 })).toThrow();
    expect(() => CharadesConfigSchema.parse({ maxSkipsPerTurn: -1 })).toThrow();
    expect(() => CharadesConfigSchema.parse({ difficultyMin: 6 })).toThrow();
  });

  it('rejects difficultyMin > difficultyMax', () => {
    expect(() => CharadesConfigSchema.parse({ difficultyMin: 5, difficultyMax: 1 })).toThrow();
  });

  it("allows secondsBetweenTurns: 0 (host wants no gap)", () => {
    const c = CharadesConfigSchema.parse({ secondsBetweenTurns: 0 });
    expect(c.secondsBetweenTurns).toBe(0);
  });
});

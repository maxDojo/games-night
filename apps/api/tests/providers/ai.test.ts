import { describe, it, expect } from 'vitest';
import { createAIProvider } from '../../src/providers/ai/index.js';
import { createDisabledAIProvider } from '../../src/providers/ai/disabled.js';

describe('AI provider', () => {
  it('disabled provider reports enabled=false', () => {
    const p = createDisabledAIProvider();
    expect(p.enabled).toBe(false);
    expect(p.name).toBe('disabled');
  });

  it('disabled provider throws on every generation method', async () => {
    const p = createDisabledAIProvider();
    await expect(p.generateTriviaQuestions({ count: 1 })).rejects.toThrow(/disabled/);
    await expect(p.generateCharadesPhrases({ count: 1 })).rejects.toThrow(/disabled/);
    await expect(p.generateTabooCards({ count: 1 })).rejects.toThrow(/disabled/);
  });

  it("factory returns disabled impl when kind='disabled'", () => {
    const p = createAIProvider('disabled');
    expect(p.name).toBe('disabled');
    expect(p.enabled).toBe(false);
  });
});

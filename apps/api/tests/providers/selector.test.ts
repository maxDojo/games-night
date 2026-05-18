import { describe, it, expect } from 'vitest';
import { providers, _resetProvidersForTests } from '../../src/config/providers.js';

describe('providers selector', () => {
  it('exposes trivia and ai providers using env defaults', () => {
    _resetProvidersForTests();
    expect(providers.trivia.name).toBe('open-trivia-db');
    expect(providers.ai.name).toBe('disabled');
  });

  it('memoises provider instances (singleton per access)', () => {
    _resetProvidersForTests();
    const a = providers.trivia;
    const b = providers.trivia;
    expect(a).toBe(b);
  });
});

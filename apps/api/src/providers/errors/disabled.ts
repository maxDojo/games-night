import type { ErrorProvider } from './types.js';

export function createDisabledErrorProvider(): ErrorProvider {
  return {
    name: 'disabled',
    enabled: false,
    async captureException() {
      // Intentionally no-op: error tracking is optional infrastructure.
    },
  };
}

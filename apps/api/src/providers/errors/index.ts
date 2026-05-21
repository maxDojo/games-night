import { createDisabledErrorProvider } from './disabled.js';
import type { ErrorProvider } from './types.js';

export type ErrorProviderKind = 'disabled';
export type { ErrorProvider, ErrorCaptureContext } from './types.js';

export function createErrorProvider(kind: ErrorProviderKind): ErrorProvider {
  switch (kind) {
    case 'disabled':
      return createDisabledErrorProvider();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unsupported error provider: ${_exhaustive}`);
    }
  }
}

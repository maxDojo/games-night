import { describe, it, expect } from 'vitest';
import { createDisabledErrorProvider } from '../../src/providers/errors/disabled.js';
import { createErrorProvider } from '../../src/providers/errors/index.js';

describe('error providers', () => {
  it('creates a disabled provider by default', async () => {
    const provider = createErrorProvider('disabled');

    expect(provider.name).toBe('disabled');
    expect(provider.enabled).toBe(false);
    await expect(provider.captureException(new Error('boom'))).resolves.toBeUndefined();
  });

  it('keeps the disabled implementation as a no-op capture sink', async () => {
    const provider = createDisabledErrorProvider();

    await expect(
      provider.captureException(new Error('boom'), {
        tags: { route: '/v1/health/ready', statusCode: 500 },
        extra: { requestId: 'req-1' },
      }),
    ).resolves.toBeUndefined();
  });
});

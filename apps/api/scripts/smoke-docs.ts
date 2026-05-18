/**
 * Smoke test: boot the API with a stub Prisma, hit /docs and /docs/json, exit.
 * Used to verify Swagger UI is actually served without needing a live Postgres.
 *
 *   npx tsx scripts/smoke-docs.ts
 */
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/games_night?schema=public';
process.env.JWT_SECRET ??= 'test-secret-with-at-least-32-characters';
process.env.ENABLE_SWAGGER ??= 'true';

async function main() {
  const { buildApp } = await import('../src/app.js');

  // Stub just enough Prisma surface to boot.
  const stubPrisma = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $queryRaw: async () => [{ ok: 1 }],
  } as unknown as PrismaClient;

  const app = await buildApp({ prisma: stubPrisma, disableSockets: true });
  await app.ready();

  const checks: Array<[string, string]> = [
    ['/docs/json', 'OpenAPI spec'],
    ['/docs/', 'Swagger UI HTML'],
    ['/v1/health', 'health endpoint'],
  ];

  let failed = 0;
  for (const [url, label] of checks) {
    const res = await app.inject({ method: 'GET', url });
    const ok = res.statusCode === 200;
    console.log(`${ok ? '✓' : '✗'}  ${res.statusCode}  ${url}  (${label})`);
    if (!ok) failed++;
  }

  const spec = await app.inject({ method: 'GET', url: '/docs/json' });
  const json = spec.json() as { paths?: Record<string, unknown> };
  console.log('\nPaths in OpenAPI spec:');
  for (const path of Object.keys(json.paths ?? {})) console.log(`  - ${path}`);

  await app.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

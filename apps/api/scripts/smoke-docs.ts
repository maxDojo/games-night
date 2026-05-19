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

  failed += assertOpenApiContract(json);

  await app.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function assertOpenApiContract(json: { paths?: Record<string, unknown> }) {
  let failed = 0;
  const paths = json.paths ?? {};

  failed += assert(Boolean(paths['/v1/games']), 'OpenAPI includes /v1/games');

  const queueRoundSchema = requestBodySchema(paths, '/v1/parties/{joinCode}/rounds', 'post');
  failed += assertGameConfigAlternatives(queueRoundSchema, 'round queue body');

  const savePlanSchema = requestBodySchema(paths, '/v1/plans', 'post');
  const planRoundSchema = savePlanSchema?.properties?.rounds?.items;
  failed += assertGameConfigAlternatives(planRoundSchema, 'plan round body');

  return failed;
}

function requestBodySchema(
  paths: Record<string, unknown>,
  path: string,
  method: string,
): SchemaObject | undefined {
  const pathItem = paths[path] as Record<string, unknown> | undefined;
  const operation = pathItem?.[method] as Record<string, unknown> | undefined;
  const requestBody = operation?.requestBody as Record<string, unknown> | undefined;
  const content = requestBody?.content as Record<string, unknown> | undefined;
  const jsonContent = content?.['application/json'] as Record<string, unknown> | undefined;
  return jsonContent?.schema as SchemaObject | undefined;
}

function assertGameConfigAlternatives(schema: SchemaObject | undefined, label: string) {
  let failed = 0;
  const alternatives = schema?.anyOf ?? [];
  failed += assert(alternatives.length >= 4, `${label} exposes typed built-in alternatives`);

  failed += assert(
    hasAlternative(alternatives, 'trivia', ['questionsPerRound', 'secondsPerQuestion']),
    `${label} includes trivia config fields`,
  );
  failed += assert(
    hasAlternative(alternatives, 'charades', ['phrasesPerTurn', 'secondsPerTurn']),
    `${label} includes charades config fields`,
  );
  failed += assert(
    hasAlternative(alternatives, 'taboo', ['cardsPerTurn', 'forbiddenWordPenalty']),
    `${label} includes taboo config fields`,
  );

  return failed;
}

function hasAlternative(alternatives: SchemaObject[], slug: string, fields: string[]) {
  return alternatives.some((alternative) => {
    const gameSlug = alternative.properties?.gameSlug;
    if (!gameSlug?.enum?.includes(slug)) return false;

    const configProperties = alternative.properties?.config?.properties ?? {};
    return fields.every((field) => Boolean(configProperties[field]));
  });
}

function assert(ok: boolean, label: string) {
  console.log(`${ok ? '✓' : '✗'}  contract  ${label}`);
  return ok ? 0 : 1;
}

interface SchemaObject {
  anyOf?: SchemaObject[];
  enum?: string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
}

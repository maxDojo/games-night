import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??=
  "postgresql://user:password@localhost:5432/games_night?schema=public";
process.env.JWT_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.ENABLE_SWAGGER ??= "true";

const outputPath = resolve("generated/openapi.json");

async function main() {
  const { buildApp } = await import("../src/app.js");
  const stubPrisma = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $queryRaw: async () => [{ ok: 1 }],
  } as unknown as PrismaClient;

  const app = await buildApp({ prisma: stubPrisma, disableSockets: true });
  await app.ready();

  const res = await app.inject({ method: "GET", url: "/docs/json" });
  if (res.statusCode !== 200) {
    throw new Error(`/docs/json returned ${res.statusCode}`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(res.json(), null, 2)}\n`);
  await app.close();

  console.log(`Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

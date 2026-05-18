import { PrismaClient } from '@prisma/client';
import { seedGames } from './seeds/games.js';
import { seedPrompts } from './seeds/prompts.js';

const prisma = new PrismaClient();

async function main() {
  const argv = new Set(process.argv.slice(2));
  const promptsOnly = argv.has('--prompts-only');
  const skipTrivia = argv.has('--skip-trivia');
  const triviaTarget = parseTarget(argv) ?? 100;

  if (!promptsOnly) {
    console.log('Seeding game definitions...');
    const count = await seedGames(prisma);
    console.log(`✓ ${count} game definitions ready.`);
  }

  console.log(`Seeding prompts (trivia target: ${triviaTarget}${skipTrivia ? ', trivia skipped' : ''})...`);
  const r = await seedPrompts(prisma, { triviaTarget, skipTrivia });
  console.log(`✓ Wrote: trivia=${r.trivia}, charades=${r.charades}, taboo=${r.taboo}`);
}

function parseTarget(argv: Set<string>): number | undefined {
  for (const a of argv) {
    const m = /^--trivia=(\d+)$/.exec(a);
    if (m) return Number(m[1]);
  }
  return undefined;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

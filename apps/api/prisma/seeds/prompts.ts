import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { providers } from '../../src/config/providers.js';
import type { CharadesPhrase, TabooCard } from '../../src/providers/ai/types.js';

// Resolve project root from this file regardless of cwd.
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

interface SeedOptions {
  /** Number of trivia questions to fetch via the trivia provider. */
  triviaTarget?: number;
  /** Skip the trivia step entirely (useful when offline / in CI). */
  skipTrivia?: boolean;
}

// --- Trivia -----------------------------------------------------------------

async function seedTrivia(prisma: PrismaClient, target: number) {
  const game = await prisma.gameDefinition.findUnique({ where: { slug: 'trivia' } });
  if (!game) throw new Error("Trivia GameDefinition not found — run seedGames first.");

  const existing = await prisma.prompt.count({ where: { gameDefinitionId: game.id } });
  if (existing >= target) {
    console.log(`  Trivia: already have ${existing} prompts (target ${target}); skipping fetch.`);
    return 0;
  }

  if (!providers.trivia.enabled) {
    console.log(`  Trivia: provider '${providers.trivia.name}' is disabled; skipping.`);
    return 0;
  }

  const need = target - existing;
  console.log(`  Trivia: fetching ${need} questions via '${providers.trivia.name}'...`);
  const questions = await providers.trivia.fetchQuestions(need);

  let written = 0;
  for (const q of questions) {
    await prisma.prompt.create({
      data: {
        gameDefinitionId: game.id,
        difficulty: q.difficulty,
        tags: q.category ? [q.category] : [],
        payload: {
          question: q.question,
          choices: shuffle([q.correctAnswer, ...q.incorrectAnswers]),
          answer: q.correctAnswer,
        },
      },
    });
    written++;
  }
  return written;
}

// --- Charades ---------------------------------------------------------------

async function seedCharades(prisma: PrismaClient) {
  const game = await prisma.gameDefinition.findUnique({ where: { slug: 'charades' } });
  if (!game) throw new Error("Charades GameDefinition not found — run seedGames first.");

  const raw = await readFile(resolve(ROOT, 'data', 'charades.seed.json'), 'utf8');
  const phrases = JSON.parse(raw) as CharadesPhrase[];

  let written = 0;
  for (const p of phrases) {
    // Idempotency: skip if a prompt with the same phrase already exists for this game.
    const dupe = await prisma.prompt.findFirst({
      where: { gameDefinitionId: game.id, payload: { path: ['phrase'], equals: p.phrase } },
    });
    if (dupe) continue;
    await prisma.prompt.create({
      data: {
        gameDefinitionId: game.id,
        difficulty: p.difficulty,
        tags: p.category ? [p.category] : [],
        payload: { phrase: p.phrase, category: p.category ?? null },
      },
    });
    written++;
  }
  return written;
}

// --- Taboo ------------------------------------------------------------------

async function seedTaboo(prisma: PrismaClient) {
  const game = await prisma.gameDefinition.findUnique({ where: { slug: 'taboo' } });
  if (!game) throw new Error("Taboo GameDefinition not found — run seedGames first.");

  const raw = await readFile(resolve(ROOT, 'data', 'taboo.seed.json'), 'utf8');
  const cards = JSON.parse(raw) as TabooCard[];

  let written = 0;
  for (const c of cards) {
    const dupe = await prisma.prompt.findFirst({
      where: { gameDefinitionId: game.id, payload: { path: ['word'], equals: c.word } },
    });
    if (dupe) continue;
    await prisma.prompt.create({
      data: {
        gameDefinitionId: game.id,
        difficulty: c.difficulty,
        tags: c.category ? [c.category] : [],
        payload: { word: c.word, forbidden: c.forbidden, category: c.category ?? null },
      },
    });
    written++;
  }
  return written;
}

// --- Orchestrator -----------------------------------------------------------

export async function seedPrompts(prisma: PrismaClient, opts: SeedOptions = {}) {
  const target = opts.triviaTarget ?? 100;

  let trivia = 0;
  if (!opts.skipTrivia) {
    try {
      trivia = await seedTrivia(prisma, target);
    } catch (err) {
      console.error('  Trivia seed failed:', (err as Error).message);
      console.error('  Continuing with charades + taboo...');
    }
  }
  const charades = await seedCharades(prisma);
  const taboo = await seedTaboo(prisma);
  return { trivia, charades, taboo };
}

// --- helpers ----------------------------------------------------------------

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

/**
 * Build a minimal Prisma stub that satisfies the routes under test.
 * Each model gets the small set of methods we actually call from handlers.
 * Casting to `PrismaClient` at the boundary keeps call-sites type-safe.
 */
export function makeMockPrisma(): {
  prisma: PrismaClient;
  mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
} {
  const mocks = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    party: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    player: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    gameDefinition: {
      findUnique: vi.fn(),
    },
    partyPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    partyPlanItem: {
      deleteMany: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    round: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    score: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  };

  // $transaction(callback): pass the same stub through so route handlers
  // that use `prisma.$transaction(async tx => { ... })` resolve correctly.
  const $transaction = vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: PrismaClient) => Promise<unknown>)(stub as unknown as PrismaClient);
    }
    return arg;
  });

  const stub = {
    ...mocks,
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction,
  };

  return { prisma: stub as unknown as PrismaClient, mocks };
}

/** Reset all mock fns on the structure returned by `makeMockPrisma`. */
export function resetMocks(mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>) {
  Object.values(mocks).forEach((model) =>
    Object.values(model).forEach((fn) => fn.mockReset()),
  );
}

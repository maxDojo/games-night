import type { PartyStatus, PrismaClient } from '@prisma/client';

export const currentPartyStatuses: readonly PartyStatus[] = ['LOBBY', 'IN_PROGRESS', 'PAUSED'];

export function isCurrentPartyStatus(status: PartyStatus) {
  return currentPartyStatuses.includes(status);
}

export async function resolveCurrentPartyId(
  prisma: PrismaClient,
  hostId: string,
  savedCurrentParty?: { id: string; status: PartyStatus } | null,
) {
  if (savedCurrentParty && isCurrentPartyStatus(savedCurrentParty.status)) {
    return savedCurrentParty.id;
  }

  const fallback = await prisma.party.findFirst({
    where: { hostId, status: { in: [...currentPartyStatuses] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

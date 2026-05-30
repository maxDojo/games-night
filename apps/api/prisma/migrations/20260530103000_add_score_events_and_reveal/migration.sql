-- AlterTable
ALTER TABLE "Party" ADD COLUMN "scoresRevealed" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "ScoreEventSource" AS ENUM ('ENGINE', 'MANUAL', 'CORRECTION', 'PENALTY', 'BONUS');

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT,
    "actorId" TEXT,
    "label" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "source" "ScoreEventSource" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreEvent_partyId_createdAt_idx" ON "ScoreEvent"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreEvent_teamId_idx" ON "ScoreEvent"("teamId");

-- CreateIndex
CREATE INDEX "ScoreEvent_roundId_idx" ON "ScoreEvent"("roundId");

-- CreateIndex
CREATE INDEX "ScoreEvent_actorId_idx" ON "ScoreEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

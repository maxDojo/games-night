-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxTeams" INTEGER NOT NULL DEFAULT 8,
    "teamCapacity" INTEGER NOT NULL DEFAULT 10,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodTeam" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#888888',
    "position" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodTeam_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Party" ADD COLUMN "periodId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "periodTeamId" TEXT,
ADD COLUMN "capacity" INTEGER;

-- CreateIndex
CREATE INDEX "Period_hostId_status_idx" ON "Period"("hostId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodTeam_periodId_position_key" ON "PeriodTeam"("periodId", "position");

-- CreateIndex
CREATE INDEX "PeriodTeam_periodId_idx" ON "PeriodTeam"("periodId");

-- CreateIndex
CREATE INDEX "Party_periodId_idx" ON "Party"("periodId");

-- CreateIndex
CREATE INDEX "Team_periodTeamId_idx" ON "Team"("periodTeamId");

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodTeam" ADD CONSTRAINT "PeriodTeam_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_periodTeamId_fkey" FOREIGN KEY ("periodTeamId") REFERENCES "PeriodTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

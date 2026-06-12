-- AlterTable
ALTER TABLE "User" ADD COLUMN "currentPartyId" TEXT;

-- CreateIndex
CREATE INDEX "User_currentPartyId_idx" ON "User"("currentPartyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentPartyId_fkey"
FOREIGN KEY ("currentPartyId") REFERENCES "Party"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PartyPlan" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "gameDefinitionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,

    CONSTRAINT "PartyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyPlan_hostId_idx" ON "PartyPlan"("hostId");

-- CreateIndex
CREATE INDEX "PartyPlanItem_planId_idx" ON "PartyPlanItem"("planId");

-- CreateIndex
CREATE INDEX "PartyPlanItem_gameDefinitionId_idx" ON "PartyPlanItem"("gameDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyPlanItem_planId_order_key" ON "PartyPlanItem"("planId", "order");

-- AddForeignKey
ALTER TABLE "PartyPlan" ADD CONSTRAINT "PartyPlan_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyPlanItem" ADD CONSTRAINT "PartyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PartyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyPlanItem" ADD CONSTRAINT "PartyPlanItem_gameDefinitionId_fkey" FOREIGN KEY ("gameDefinitionId") REFERENCES "GameDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

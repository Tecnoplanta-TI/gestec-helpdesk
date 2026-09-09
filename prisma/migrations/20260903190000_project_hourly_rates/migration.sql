-- CreateTable
CREATE TABLE "ProjectHourlyRate" (
    "id" UUID NOT NULL,
    "costCenterId" UUID,
    "manualProjectId" UUID,
    "amountCents" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectHourlyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectHourlyRate_costCenterId_effectiveFrom_key" ON "ProjectHourlyRate"("costCenterId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectHourlyRate_manualProjectId_effectiveFrom_key" ON "ProjectHourlyRate"("manualProjectId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ProjectHourlyRate_costCenterId_effectiveFrom_idx" ON "ProjectHourlyRate"("costCenterId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ProjectHourlyRate_manualProjectId_effectiveFrom_idx" ON "ProjectHourlyRate"("manualProjectId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "ProjectHourlyRate" ADD CONSTRAINT "ProjectHourlyRate_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHourlyRate" ADD CONSTRAINT "ProjectHourlyRate_manualProjectId_fkey" FOREIGN KEY ("manualProjectId") REFERENCES "ManualProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHourlyRate" ADD CONSTRAINT "ProjectHourlyRate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserRef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

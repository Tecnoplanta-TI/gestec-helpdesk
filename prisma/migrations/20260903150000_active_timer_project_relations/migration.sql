CREATE INDEX "ActiveTimer_costCenterId_idx" ON "ActiveTimer"("costCenterId");
CREATE INDEX "ActiveTimer_manualProjectId_idx" ON "ActiveTimer"("manualProjectId");

ALTER TABLE "ActiveTimer"
  ADD CONSTRAINT "ActiveTimer_costCenterId_fkey"
  FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActiveTimer"
  ADD CONSTRAINT "ActiveTimer_manualProjectId_fkey"
  FOREIGN KEY ("manualProjectId") REFERENCES "ManualProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProjectCostCenterShare" (
  "id" UUID NOT NULL,
  "manualProjectId" UUID NOT NULL,
  "costCenterId" UUID NOT NULL,
  "shareBps" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectCostCenterShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectCostCenterShare_shareBps_check" CHECK ("shareBps" > 0 AND "shareBps" <= 10000)
);

CREATE UNIQUE INDEX "ProjectCostCenterShare_manualProjectId_costCenterId_key"
  ON "ProjectCostCenterShare"("manualProjectId", "costCenterId");
CREATE INDEX "ProjectCostCenterShare_costCenterId_idx"
  ON "ProjectCostCenterShare"("costCenterId");

ALTER TABLE "ProjectCostCenterShare"
  ADD CONSTRAINT "ProjectCostCenterShare_manualProjectId_fkey"
  FOREIGN KEY ("manualProjectId") REFERENCES "ManualProject"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCostCenterShare"
  ADD CONSTRAINT "ProjectCostCenterShare_costCenterId_fkey"
  FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectCostCenterShare" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."ProjectCostCenterShare" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."ProjectCostCenterShare" FROM authenticated;
  END IF;
END $$;

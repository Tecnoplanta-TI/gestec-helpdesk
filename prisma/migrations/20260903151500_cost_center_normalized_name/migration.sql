ALTER TABLE "CostCenter" ADD COLUMN "normalizedName" TEXT;
UPDATE "CostCenter"
SET "normalizedName" = lower(btrim(translate(
  "name",
  'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
  'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
)));
ALTER TABLE "CostCenter" ALTER COLUMN "normalizedName" SET NOT NULL;
CREATE UNIQUE INDEX "CostCenter_normalizedName_key" ON "CostCenter"("normalizedName");

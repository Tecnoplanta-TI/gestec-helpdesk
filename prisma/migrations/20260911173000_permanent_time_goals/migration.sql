-- Metas permanentes não têm data de término e continuam vigentes até serem desativadas.
ALTER TABLE "TimeGoal"
  ADD COLUMN "permanent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TimeGoal"
  ALTER COLUMN "endsOn" DROP NOT NULL;

ALTER TABLE "TimeGoal"
  DROP CONSTRAINT IF EXISTS "TimeGoal_dates_check";

ALTER TABLE "TimeGoal"
  ADD CONSTRAINT "TimeGoal_dates_check"
  CHECK (
    ("permanent" = true AND "endsOn" IS NULL)
    OR
    ("permanent" = false AND "endsOn" IS NOT NULL AND "endsOn" >= "startsOn")
  );

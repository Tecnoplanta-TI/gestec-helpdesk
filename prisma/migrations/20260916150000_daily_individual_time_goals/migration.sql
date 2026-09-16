-- Goals are now individual and can be daily or monthly. Group-based goals are
-- intentionally removed as requested; existing group goals cannot be mapped
-- unambiguously to one user and are discarded.
DELETE FROM "TimeGoal"
WHERE "targetGroupId" IS NOT NULL OR "targetUserId" IS NULL;

CREATE TYPE "GoalPeriod" AS ENUM ('DAILY', 'MONTHLY');

ALTER TABLE "TimeGoal"
  ADD COLUMN "period" "GoalPeriod" NOT NULL DEFAULT 'MONTHLY',
  ALTER COLUMN "targetUserId" SET NOT NULL,
  DROP COLUMN "targetGroupId";

DROP INDEX IF EXISTS "TimeGoal_targetGroupId_active_startsOn_endsOn_idx";
CREATE INDEX "TimeGoal_targetUserId_period_active_startsOn_endsOn_idx"
  ON "TimeGoal"("targetUserId", "period", "active", "startsOn", "endsOn");

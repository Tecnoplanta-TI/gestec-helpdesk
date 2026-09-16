-- New goals are configured only in hours per calendar day. The monthly
-- equivalent is calculated by the application from each month length.
ALTER TABLE "TimeGoal"
  ALTER COLUMN "period" SET DEFAULT 'DAILY';

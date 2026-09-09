-- Preserve timer start/stop idempotency after the active row is removed.
ALTER TABLE "TimeEntry" ADD COLUMN "timerStartRequestKey" TEXT;
ALTER TABLE "TimeEntry" ADD COLUMN "timerStopRequestKey" TEXT;

CREATE UNIQUE INDEX "TimeEntry_timerStartRequestKey_key"
ON "TimeEntry"("timerStartRequestKey");
CREATE UNIQUE INDEX "TimeEntry_timerStopRequestKey_key"
ON "TimeEntry"("timerStopRequestKey");

-- Closed work periods must have positive elapsed time.
ALTER TABLE "TicketWorkPeriod"
  DROP CONSTRAINT "TicketWorkPeriod_valid_interval_check";
ALTER TABLE "TicketWorkPeriod"
  ADD CONSTRAINT "TicketWorkPeriod_valid_interval_check"
  CHECK ("endedAt" IS NULL OR "endedAt" > "startedAt");

-- A classified time entry always belongs to exactly one project.
ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_classified_project_check"
  CHECK (
    "status" = 'PENDING_CLASSIFICATION'
    OR (("costCenterId" IS NOT NULL)::integer + ("manualProjectId" IS NOT NULL)::integer) = 1
  );

-- A rate belongs to one project and cannot be negative.
ALTER TABLE "ProjectHourlyRate"
  ADD CONSTRAINT "ProjectHourlyRate_single_project_check"
  CHECK (("costCenterId" IS NOT NULL)::integer + ("manualProjectId" IS NOT NULL)::integer = 1);
ALTER TABLE "ProjectHourlyRate"
  ADD CONSTRAINT "ProjectHourlyRate_non_negative_check"
  CHECK ("amountCents" >= 0);

-- Add optimistic-lock versions to mutable time records.
ALTER TABLE "TimeEntry" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ActiveTimer" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- At most one open ticket-work period may exist for a user, including concurrent requests.
CREATE UNIQUE INDEX "TicketWorkPeriod_one_open_per_user_key"
ON "TicketWorkPeriod" ("userId")
WHERE "endedAt" IS NULL;

-- Domain integrity that Prisma cannot express directly.
ALTER TABLE "TicketWorkPeriod"
  ADD CONSTRAINT "TicketWorkPeriod_valid_interval_check"
  CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_valid_interval_check"
  CHECK ("endedAt" > "startedAt" AND "durationSeconds" > 0);

ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_single_project_check"
  CHECK ((("costCenterId" IS NOT NULL)::integer + ("manualProjectId" IS NOT NULL)::integer) <= 1);

ALTER TABLE "ActiveTimer"
  ADD CONSTRAINT "ActiveTimer_single_project_check"
  CHECK ((("costCenterId" IS NOT NULL)::integer + ("manualProjectId" IS NOT NULL)::integer) = 1);

ALTER TABLE "TicketEvaluation"
  ADD CONSTRAINT "TicketEvaluation_score_check"
  CHECK ("score" BETWEEN 1 AND 10);

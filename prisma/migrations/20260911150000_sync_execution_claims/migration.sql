-- Prevent two workers (or a worker and a manual retry) from dispatching the
-- same outbound transition at the same time. Stale claims remain recoverable.
ALTER TYPE "SyncStatus" ADD VALUE 'PROCESSING';

ALTER TABLE "SyncExecution"
ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE INDEX "SyncExecution_status_processingStartedAt_idx"
ON "SyncExecution"("status", "processingStartedAt");

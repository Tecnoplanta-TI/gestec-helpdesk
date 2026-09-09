-- Preserve every requester evaluation instead of overwriting the previous
-- cycle when a low score reopens a ticket.
ALTER TABLE "TicketEvaluation"
  ADD COLUMN "resolutionCycle" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "TicketEvaluation_ticketId_key";

CREATE UNIQUE INDEX "TicketEvaluation_ticketId_resolutionCycle_key"
  ON "TicketEvaluation"("ticketId", "resolutionCycle");

CREATE INDEX "TicketEvaluation_ticketId_createdAt_idx"
  ON "TicketEvaluation"("ticketId", "createdAt");

ALTER TABLE "TicketEvaluation"
  ADD CONSTRAINT "TicketEvaluation_resolutionCycle_check"
  CHECK ("resolutionCycle" >= 1);

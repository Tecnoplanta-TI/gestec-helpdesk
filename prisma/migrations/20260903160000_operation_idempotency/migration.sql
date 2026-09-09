ALTER TABLE "TicketComment" ADD COLUMN "requestKey" TEXT;
ALTER TABLE "TicketAttachment" ADD COLUMN "requestKey" TEXT;
ALTER TABLE "TicketWorkPeriod" ADD COLUMN "startRequestKey" TEXT;
ALTER TABLE "TicketWorkPeriod" ADD COLUMN "stopRequestKey" TEXT;

CREATE UNIQUE INDEX "TicketComment_requestKey_key" ON "TicketComment"("requestKey");
CREATE UNIQUE INDEX "TicketAttachment_requestKey_key" ON "TicketAttachment"("requestKey");
CREATE UNIQUE INDEX "TicketWorkPeriod_startRequestKey_key" ON "TicketWorkPeriod"("startRequestKey");
CREATE UNIQUE INDEX "TicketWorkPeriod_stopRequestKey_key" ON "TicketWorkPeriod"("stopRequestKey");

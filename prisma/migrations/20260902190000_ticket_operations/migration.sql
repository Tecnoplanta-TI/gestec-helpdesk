-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('PRIMARY', 'ADDITIONAL', 'OBSERVER');

-- CreateEnum
CREATE TYPE "TicketAssetRelation" AS ENUM ('CONTEXT', 'DELIVERED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "catalogServiceId" UUID;
ALTER TABLE "Ticket" ADD COLUMN "firstContactDeadline" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "serviceDeadline" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ServiceGroup" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketParticipant" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "addedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "TicketParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "commentId" UUID,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TicketAsset" ADD COLUMN "relationType" "TicketAssetRelation" NOT NULL DEFAULT 'CONTEXT';
ALTER TABLE "TicketAsset" ADD COLUMN "linkedById" UUID;
ALTER TABLE "TicketAsset" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TicketAsset" ADD COLUMN "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceGroup_code_key" ON "ServiceGroup"("code");
CREATE INDEX "ServiceGroup_active_name_idx" ON "ServiceGroup"("active", "name");
CREATE UNIQUE INDEX "Service_groupId_code_key" ON "Service"("groupId", "code");
CREATE INDEX "Service_active_name_idx" ON "Service"("active", "name");
CREATE INDEX "Ticket_requestType_status_idx" ON "Ticket"("requestType", "status");
CREATE INDEX "TicketParticipant_ticketId_removedAt_idx" ON "TicketParticipant"("ticketId", "removedAt");
CREATE INDEX "TicketParticipant_userId_removedAt_idx" ON "TicketParticipant"("userId", "removedAt");
CREATE UNIQUE INDEX "TicketAttachment_storageKey_key" ON "TicketAttachment"("storageKey");
CREATE INDEX "TicketAttachment_ticketId_deletedAt_idx" ON "TicketAttachment"("ticketId", "deletedAt");
CREATE INDEX "TicketAsset_ticketId_removedAt_idx" ON "TicketAsset"("ticketId", "removedAt");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ServiceGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketParticipant" ADD CONSTRAINT "TicketParticipant_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketParticipant" ADD CONSTRAINT "TicketParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserRef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketParticipant" ADD CONSTRAINT "TicketParticipant_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "UserRef"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TicketComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "UserRef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAsset" ADD CONSTRAINT "TicketAsset_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "UserRef"("id") ON DELETE SET NULL ON UPDATE CASCADE;

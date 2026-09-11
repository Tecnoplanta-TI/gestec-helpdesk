-- Clientes continuam usando a tabela e as identidades estáveis de centros de
-- custo. Projetos passam a poder apontar para um cliente sem reclassificar os
-- lançamentos históricos que ainda referenciam diretamente um cliente.
ALTER TABLE "ManualProject" ADD COLUMN "costCenterId" UUID;
CREATE INDEX "ManualProject_costCenterId_active_name_idx"
  ON "ManualProject"("costCenterId", "active", "name");
ALTER TABLE "ManualProject"
  ADD CONSTRAINT "ManualProject_costCenterId_fkey"
  FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectHourlyRate" (
  "id" UUID NOT NULL,
  "manualProjectId" UUID NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectHourlyRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectHourlyRate_amountCents_check" CHECK ("amountCents" >= 0)
);
CREATE UNIQUE INDEX "ProjectHourlyRate_manualProjectId_effectiveFrom_key"
  ON "ProjectHourlyRate"("manualProjectId", "effectiveFrom");
CREATE INDEX "ProjectHourlyRate_manualProjectId_effectiveFrom_idx"
  ON "ProjectHourlyRate"("manualProjectId", "effectiveFrom");
ALTER TABLE "ProjectHourlyRate"
  ADD CONSTRAINT "ProjectHourlyRate_manualProjectId_fkey"
  FOREIGN KEY ("manualProjectId") REFERENCES "ManualProject"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectHourlyRate"
  ADD CONSTRAINT "ProjectHourlyRate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "UserRef"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "UserGroup" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "managerId" UUID,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserGroup_normalizedName_key" ON "UserGroup"("normalizedName");
CREATE INDEX "UserGroup_active_name_idx" ON "UserGroup"("active", "name");
CREATE INDEX "UserGroup_managerId_active_idx" ON "UserGroup"("managerId", "active");
ALTER TABLE "UserGroup"
  ADD CONSTRAINT "UserGroup_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "UserRef"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserGroupMember" (
  "userGroupId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserGroupMember_pkey" PRIMARY KEY ("userGroupId", "userId")
);
CREATE INDEX "UserGroupMember_userId_userGroupId_idx" ON "UserGroupMember"("userId", "userGroupId");
ALTER TABLE "UserGroupMember"
  ADD CONSTRAINT "UserGroupMember_userGroupId_fkey"
  FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGroupMember"
  ADD CONSTRAINT "UserGroupMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserRef"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TimeGoal" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "targetSeconds" INTEGER NOT NULL,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "targetUserId" UUID,
  "targetGroupId" UUID,
  "manualProjectId" UUID,
  "costCenterId" UUID,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeGoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimeGoal_target_check" CHECK ((CASE WHEN "targetUserId" IS NULL THEN 0 ELSE 1 END) + (CASE WHEN "targetGroupId" IS NULL THEN 0 ELSE 1 END) = 1),
  CONSTRAINT "TimeGoal_dates_check" CHECK ("endsOn" >= "startsOn"),
  CONSTRAINT "TimeGoal_targetSeconds_check" CHECK ("targetSeconds" > 0)
);
CREATE INDEX "TimeGoal_targetUserId_active_startsOn_endsOn_idx" ON "TimeGoal"("targetUserId", "active", "startsOn", "endsOn");
CREATE INDEX "TimeGoal_targetGroupId_active_startsOn_endsOn_idx" ON "TimeGoal"("targetGroupId", "active", "startsOn", "endsOn");
CREATE INDEX "TimeGoal_manualProjectId_costCenterId_idx" ON "TimeGoal"("manualProjectId", "costCenterId");
ALTER TABLE "TimeGoal" ADD CONSTRAINT "TimeGoal_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "UserRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeGoal" ADD CONSTRAINT "TimeGoal_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeGoal" ADD CONSTRAINT "TimeGoal_manualProjectId_fkey" FOREIGN KEY ("manualProjectId") REFERENCES "ManualProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeGoal" ADD CONSTRAINT "TimeGoal_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeGoal" ADD CONSTRAINT "TimeGoal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserRef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "resourceType" TEXT,
  "resourceId" TEXT,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "Notification_recipientId_source_createdAt_idx" ON "Notification"("recipientId", "source", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "UserRef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

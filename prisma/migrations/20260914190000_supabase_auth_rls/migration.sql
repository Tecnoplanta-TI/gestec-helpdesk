-- Supabase Auth identity and Row Level Security.
-- The application uses Prisma with its database role. These policies protect
-- Supabase Data API clients: anonymous users get no table access, while an
-- authenticated user may read only their own directory profile.

ALTER TABLE "UserRef" ADD COLUMN "authUserId" UUID;
CREATE UNIQUE INDEX "UserRef_authUserId_key" ON "UserRef"("authUserId");

ALTER TABLE "UserRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostCenter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ManualProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectHourlyRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserGroupMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketWorkPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActiveTimer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
  managed_tables TEXT[] := ARRAY[
    'UserRef', 'CostCenter', 'ServiceGroup', 'Service', 'ManualProject',
    'ProjectHourlyRate', 'UserGroup', 'UserGroupMember', 'TimeGoal',
    'Notification', 'Ticket', 'TicketComment', 'TicketParticipant',
    'TicketAttachment', 'TicketHistory', 'TicketWorkPeriod', 'TimeEntry',
    'ActiveTimer', 'Asset', 'TicketAsset', 'TicketEvaluation',
    'SyncExecution', 'AuditEvent'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    FOREACH table_name IN ARRAY managed_tables LOOP
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOREACH table_name IN ARRAY managed_tables LOOP
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END LOOP;
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT ON TABLE public."UserRef" TO authenticated;
    CREATE POLICY "authenticated users can read their own profile"
      ON public."UserRef"
      FOR SELECT TO authenticated
      USING ("authUserId" = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    ALTER TABLE public."UserRef"
      ADD CONSTRAINT "UserRef_authUserId_fkey"
      FOREIGN KEY ("authUserId") REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

import { addMonths, startOfMonth } from "date-fns";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { listProjectCatalog } from "@/lib/domain/projects";
import { ProjectList } from "@/components/time/project-list";

export const dynamic = "force-dynamic";

export default async function JornadaProjetosPage() {
  const session = await requirePermission("time:view");
  const now = new Date();
  const canManage = hasPermission(session.role, "time:manage");
  const projects = await listProjectCatalog({
    includePrivateManual: canManage,
    includeInactive: canManage,
    monthFrom: startOfMonth(now),
    monthTo: startOfMonth(addMonths(now, 1)),
  });

  return (
    <ProjectList
      projects={projects}
      canManage={canManage}
    />
  );
}

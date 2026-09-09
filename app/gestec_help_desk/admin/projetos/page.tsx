import { addMonths, startOfMonth } from "date-fns";

import { AdminProjectManager } from "@/components/admin/project-manager";
import { requirePermission } from "@/lib/auth/session";
import { listProjectCatalog } from "@/lib/domain/projects";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  await requirePermission("admin:manage");
  const now = new Date();
  const projects = await listProjectCatalog({
    includePrivateManual: true,
    includeInactive: true,
    monthFrom: startOfMonth(now),
    monthTo: startOfMonth(addMonths(now, 1)),
  });

  return <AdminProjectManager projects={projects} />;
}

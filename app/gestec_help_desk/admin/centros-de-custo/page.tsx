import { CostCenterManager } from "@/components/settings/cost-center-manager";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCostCentersPage() {
  await requirePermission("admin:manage");
  const costCenters = await prisma.costCenter.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <CostCenterManager
      initialItems={costCenters.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))}
    />
  );
}

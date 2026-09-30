import { CostCenterManager } from "@/components/settings/cost-center-manager";
import { requirePagePermission } from "@/lib/auth/page-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCostCentersPage() {
  await requirePagePermission("admin:manage");
  const costCenters = (
    await prisma.costCenter.findMany({
      orderBy: [{ active: "desc" }, { code: "asc" }],
    })
  ).sort((left, right) => {
    const leftCode = Number(left.code);
    const rightCode = Number(right.code);
    if (
      Number.isFinite(leftCode) &&
      Number.isFinite(rightCode) &&
      leftCode !== rightCode
    ) {
      return leftCode - rightCode;
    }
    return left.code.localeCompare(right.code, "pt-BR", { numeric: true });
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

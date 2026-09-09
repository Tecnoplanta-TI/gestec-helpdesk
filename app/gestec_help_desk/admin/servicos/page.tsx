import { ServiceCatalogManager } from "@/components/settings/service-catalog-manager";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requirePermission("admin:manage");
  const groups = await prisma.serviceGroup.findMany({
    include: { services: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return (
    <ServiceCatalogManager initialGroups={JSON.parse(JSON.stringify(groups))} />
  );
}

import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AssetManager } from "@/components/assets/asset-manager";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const session = await requirePermission("assets:view");
  const assets = await prisma.asset.findMany({ orderBy: { name: "asc" } });
  return (
    <AssetManager
      initialItems={JSON.parse(JSON.stringify(assets))}
      canManage={hasPermission(session.role, "assets:manage")}
    />
  );
}

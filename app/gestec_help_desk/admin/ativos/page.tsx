import { AssetManager } from "@/components/assets/asset-manager";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  await requirePermission("admin:manage");
  const assets = await prisma.asset.findMany({ orderBy: { name: "asc" } });
  return (
    <AssetManager initialItems={JSON.parse(JSON.stringify(assets))} canManage />
  );
}

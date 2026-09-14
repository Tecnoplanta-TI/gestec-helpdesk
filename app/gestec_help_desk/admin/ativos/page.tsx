import { AssetManager } from "@/components/assets/asset-manager";
import { requirePagePermission } from "@/lib/auth/page-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  await requirePagePermission("admin:manage");
  const assets = await prisma.asset.findMany({ orderBy: { name: "asc" } });
  return (
    <AssetManager initialItems={JSON.parse(JSON.stringify(assets))} canManage />
  );
}

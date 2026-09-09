import { AdminUserManager } from "@/components/admin/user-manager";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requirePermission("admin:manage");
  const users = await prisma.userRef.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <AdminUserManager
      currentUserId={session.userId}
      initialItems={JSON.parse(JSON.stringify(users))}
    />
  );
}

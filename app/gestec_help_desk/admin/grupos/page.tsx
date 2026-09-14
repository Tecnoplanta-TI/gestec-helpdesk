import { UserGroupManager } from "@/components/goals/user-group-manager";
import { requirePagePermission } from "@/lib/auth/page-session";
import { listAssignableUsers } from "@/lib/domain/users";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requirePagePermission("admin:manage");
  const [groups, users] = await Promise.all([
    prisma.userGroup.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    listAssignableUsers(),
  ]);
  return <UserGroupManager initialGroups={groups} users={users} />;
}

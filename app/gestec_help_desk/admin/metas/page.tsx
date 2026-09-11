import { GoalManager } from "@/components/goals/goal-manager";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { listAssignableUsers } from "@/lib/domain/users";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await requirePermission("goals:view");
  const isAdmin = hasPermission(session.role, "admin:manage");
  const groupWhere = isAdmin ? {} : { managerId: session.userId };
  const [goals, users, groups] = await Promise.all([
    prisma.timeGoal.findMany({ where: isAdmin ? {} : { OR: [{ targetUserId: session.userId }, { targetGroup: { managerId: session.userId } }] }, include: { targetUser: { select: { id: true, name: true } }, targetGroup: { select: { id: true, name: true } }, project: { select: { name: true } }, client: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    listAssignableUsers(),
    prisma.userGroup.findMany({ where: groupWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <GoalManager canManage={hasPermission(session.role, "goals:manage")} users={users} groups={groups} goals={goals.map((goal) => ({ ...goal, startsOn: goal.startsOn.toISOString(), endsOn: goal.endsOn.toISOString() }))} />;
}

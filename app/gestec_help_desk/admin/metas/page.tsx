import { GoalManager } from "@/components/goals/goal-manager";
import { requirePagePermission } from "@/lib/auth/page-session";
import { listAssignableUsers } from "@/lib/domain/users";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  await requirePagePermission("goals:view");
  const [goals, users] = await Promise.all([
    prisma.timeGoal.findMany({
      include: {
        targetUser: { select: { id: true, name: true } },
        project: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    listAssignableUsers(),
  ]);
  return (
    <GoalManager
      canManage={true}
      users={users}
      goals={goals.map((goal) => ({
        ...goal,
        startsOn: goal.startsOn.toISOString(),
        endsOn: goal.endsOn?.toISOString() ?? null,
      }))}
    />
  );
}

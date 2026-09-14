import "server-only";

import { prisma } from "@/lib/prisma";
import { selectEffectiveGoalSeconds } from "@/lib/domain/time-goals";

export async function effectiveGoalSecondsByUser(
  userIds: string[],
  at: Date,
  fallbackSeconds: number,
) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return new Map<string, number>();
  const dateOnly = new Date(
    Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()),
  );
  const goals = await prisma.timeGoal.findMany({
    where: {
      active: true,
      startsOn: { lte: dateOnly },
      AND: [
        {
          OR: [{ endsOn: null }, { endsOn: { gte: dateOnly } }],
        },
      ],
      OR: [
        { targetUserId: { in: uniqueUserIds } },
        {
          targetGroup: {
            active: true,
            members: { some: { userId: { in: uniqueUserIds } } },
          },
        },
      ],
    },
    select: {
      targetSeconds: true,
      targetUserId: true,
      targetGroup: {
        select: {
          members: {
            where: { userId: { in: uniqueUserIds } },
            select: { userId: true },
          },
        },
      },
    },
    orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }],
  });
  return selectEffectiveGoalSeconds(uniqueUserIds, goals, fallbackSeconds);
}

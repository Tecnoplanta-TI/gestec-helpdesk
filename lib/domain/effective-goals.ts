import "server-only";

import { GoalPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { selectEffectiveDailyGoalSeconds } from "@/lib/domain/time-goals";

export async function effectiveDailyGoalSecondsByUser(
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
      period: GoalPeriod.DAILY,
      startsOn: { lte: dateOnly },
      AND: [
        {
          OR: [{ endsOn: null }, { endsOn: { gte: dateOnly } }],
        },
      ],
      targetUserId: { in: uniqueUserIds },
    },
    select: {
      targetSeconds: true,
      targetUserId: true,
    },
    orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }],
  });
  return selectEffectiveDailyGoalSeconds(
    uniqueUserIds,
    goals,
    fallbackSeconds,
  );
}

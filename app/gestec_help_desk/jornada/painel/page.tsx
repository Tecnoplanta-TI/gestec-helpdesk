import { addMonths, startOfMonth } from "date-fns";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { monthlyGoalSeconds } from "@/lib/domain/time-goals";
import { listTeamMonthHours } from "@/lib/domain/team-time";
import {
  operationalTimeWhere,
  parseTimeFilters,
  timeRangeWhere,
  todayBounds,
} from "@/lib/domain/time-query";
import { prisma } from "@/lib/prisma";
import { TimeDashboard } from "@/components/time/time-dashboard";

export const dynamic = "force-dynamic";

export default async function JornadaPainelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("time:view");
  const now = new Date();
  const filters = parseTimeFilters(await searchParams, now);
  const today = todayBounds(now);
  const monthFrom = startOfMonth(now);
  const monthTo = startOfMonth(addMonths(now, 1));
  const canSeeTeam =
    hasPermission(session.role, "time:manage") ||
    hasPermission(session.role, "reports:view");

  const [todayEntries, weekEntries, monthEntries, monthBillable, team] =
    await Promise.all([
      prisma.timeEntry.aggregate({
        where: {
          ...operationalTimeWhere(session.userId, filters),
          ...timeRangeWhere(today.from, today.to),
        },
        _sum: { durationSeconds: true },
      }),
      prisma.timeEntry.aggregate({
        where: {
          ...operationalTimeWhere(session.userId, filters),
          ...timeRangeWhere(filters.weekStart, filters.weekEnd),
        },
        _sum: { durationSeconds: true },
      }),
      prisma.timeEntry.aggregate({
        where: {
          userId: session.userId,
          status: { not: "VOIDED" as const },
          startedAt: { gte: monthFrom, lt: monthTo },
        },
        _sum: { durationSeconds: true },
      }),
      prisma.timeEntry.aggregate({
        where: {
          userId: session.userId,
          status: { not: "VOIDED" as const },
          billable: true,
          startedAt: { gte: monthFrom, lt: monthTo },
        },
        _sum: { durationSeconds: true },
      }),
      listTeamMonthHours({
        monthFrom,
        monthTo,
        userId: canSeeTeam ? undefined : session.userId,
      }),
    ]);

  return (
    <TimeDashboard
      todaySeconds={todayEntries._sum.durationSeconds ?? 0}
      weekSeconds={weekEntries._sum.durationSeconds ?? 0}
      monthSeconds={monthEntries._sum.durationSeconds ?? 0}
      billableSeconds={monthBillable._sum.durationSeconds ?? 0}
      monthlyGoalSeconds={monthlyGoalSeconds(now)}
      team={team}
    />
  );
}

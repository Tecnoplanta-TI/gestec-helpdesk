import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { listProjects } from "@/lib/domain/projects";
import {
  composeProjectId,
  formatWeekParam,
  operationalTimeWhere,
  parseTimeFilters,
  summarizeTimeEntries,
  timeRangeWhere,
  todayBounds,
} from "@/lib/domain/time-query";
import { prisma } from "@/lib/prisma";
import { TimeWorkspace } from "@/components/time/time-workspace";

export const dynamic = "force-dynamic";

export default async function JornadaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("time:view");
  const now = new Date();
  const filters = parseTimeFilters(await searchParams, now);
  const today = todayBounds(now);
  const includePrivateManual = hasPermission(session.role, "time:manage");
  const listWhere = {
    ...operationalTimeWhere(session.userId, filters),
    ...timeRangeWhere(filters.weekStart, filters.weekEnd),
  };

  const [
    projects,
    activeTimer,
    entries,
    todayEntries,
    recentRows,
    workPeriods,
  ] = await Promise.all([
    listProjects(undefined, { includePrivateManual }),
    prisma.activeTimer.findUnique({ where: { userId: session.userId } }),
    prisma.timeEntry.findMany({
      where: listWhere,
      select: {
        id: true,
        ticketId: true,
        description: true,
        projectNameSnapshot: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        billable: true,
        source: true,
        status: true,
        costCenterId: true,
        manualProjectId: true,
        version: true,
        ticket: { select: { number: true, externalReference: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.timeEntry.aggregate({
      where: {
        ...operationalTimeWhere(session.userId, filters),
        ...timeRangeWhere(today.from, today.to),
      },
      _sum: { durationSeconds: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: session.userId,
        status: { not: "VOIDED" as const },
        OR: [
          { costCenterId: { not: null } },
          { manualProjectId: { not: null } },
        ],
      },
      orderBy: { startedAt: "desc" },
      take: 40,
      select: { costCenterId: true, manualProjectId: true },
    }),
    prisma.ticketWorkPeriod.findMany({
      where: {
        userId: session.userId,
        valid: true,
        endedAt: { not: null, gte: filters.weekStart },
        startedAt: { lt: filters.weekEnd },
      },
      select: { ticketId: true, startedAt: true, endedAt: true },
    }),
  ]);

  const serializedEntries = entries.map((entry) => {
    const periodCount = entry.ticketId
      ? workPeriods.filter(
          (period) =>
            period.ticketId === entry.ticketId &&
            period.startedAt >= entry.startedAt &&
            period.endedAt !== null &&
            period.endedAt <= entry.endedAt,
        ).length
      : 1;
    return {
      id: entry.id,
      description: entry.description,
      projectNameSnapshot: entry.projectNameSnapshot,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt.toISOString(),
      durationSeconds: entry.durationSeconds,
      billable: entry.billable,
      source: entry.source,
      status: entry.status,
      costCenterId: entry.costCenterId,
      manualProjectId: entry.manualProjectId,
      version: entry.version,
      ticket: entry.ticket,
      periodCount: Math.max(1, periodCount),
    };
  });

  const recentProjectIds = [
    ...new Set(recentRows.map((row) => composeProjectId(row)).filter(Boolean)),
  ].slice(0, 8);
  const weekTotals = summarizeTimeEntries(entries);
  const weekLabel = `${format(filters.weekStart, "d MMM", { locale: ptBR })} – ${format(addDays(filters.weekEnd, -1), "d MMM yyyy", { locale: ptBR })}`;
  const exportParams = new URLSearchParams({
    from: filters.weekStart.toISOString(),
    to: new Date(filters.weekEnd.getTime() - 1).toISOString(),
    userId: session.userId,
  });
  if (filters.projectId) exportParams.set("project", filters.projectId);
  if (filters.ticket) exportParams.set("ticket", filters.ticket);
  if (filters.billable !== "all")
    exportParams.set("billable", filters.billable);

  return (
    <TimeWorkspace
      projects={projects}
      recentProjectIds={recentProjectIds}
      activeTimer={
        activeTimer
          ? {
              ...JSON.parse(JSON.stringify(activeTimer)),
              projectId: composeProjectId(activeTimer),
            }
          : null
      }
      entries={serializedEntries}
      totals={{
        today: todayEntries._sum.durationSeconds ?? 0,
        week: weekTotals.week,
        billable: weekTotals.billable,
        nonBillable: weekTotals.nonBillable,
        byProject: weekTotals.byProject,
      }}
      filters={{
        from: formatWeekParam(filters.weekStart),
        project: filters.projectId ?? "",
        ticket: filters.ticket ?? "",
        billable: filters.billable,
      }}
      weekLabel={weekLabel}
      canWrite={hasPermission(session.role, "time:write")}
      canManageProjects={includePrivateManual}
      exportHref={
        hasPermission(session.role, "reports:export")
          ? `/api/v1/gestec-help-desk/reports/time-entries.xlsx?${exportParams}`
          : null
      }
      serverNow={now.toISOString()}
    />
  );
}

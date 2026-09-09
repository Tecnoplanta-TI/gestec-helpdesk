import type { Prisma } from "@prisma/client";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";

const PROJECT_ID = /^(cost-center|manual):[0-9a-f-]{36}$/i;

export type TimeBillableFilter = "all" | "billable" | "non-billable";

export type TimeListFilters = {
  weekStart: Date;
  weekEnd: Date;
  projectId?: string;
  ticket?: string;
  billable: TimeBillableFilter;
};

export function composeProjectId(input: {
  costCenterId?: string | null;
  manualProjectId?: string | null;
}) {
  if (input.costCenterId) return `cost-center:${input.costCenterId}`;
  if (input.manualProjectId) return `manual:${input.manualProjectId}`;
  return "";
}

export function timerStopIdempotencyKey(timerId: string) {
  return `timer-stop:${timerId}`;
}

export function parseTimeFilters(
  params: Record<string, string | string[] | undefined>,
  now = new Date(),
): TimeListFilters {
  const fromValue = typeof params.from === "string" ? params.from.trim() : "";
  const parsedFrom =
    fromValue && /^\d{4}-\d{2}-\d{2}$/.test(fromValue)
      ? new Date(`${fromValue}T12:00:00`)
      : now;
  const weekStart = startOfWeek(
    Number.isNaN(parsedFrom.getTime()) ? now : parsedFrom,
    { weekStartsOn: 1 },
  );
  const projectValue =
    typeof params.project === "string" ? params.project.trim() : "";
  const ticket = typeof params.ticket === "string" ? params.ticket.trim() : "";
  const billableValue =
    typeof params.billable === "string" ? params.billable : "all";

  return {
    weekStart,
    weekEnd: addDays(weekStart, 7),
    projectId: PROJECT_ID.test(projectValue) ? projectValue : undefined,
    ticket: ticket || undefined,
    billable:
      billableValue === "billable" || billableValue === "non-billable"
        ? billableValue
        : "all",
  };
}

export function timeRangeWhere(
  from: Date,
  to: Date,
): Prisma.TimeEntryWhereInput {
  return { startedAt: { gte: from, lt: to } };
}

export function operationalTimeWhere(
  userId: string,
  filters: Pick<TimeListFilters, "projectId" | "ticket" | "billable">,
): Prisma.TimeEntryWhereInput {
  const project = filters.projectId?.split(":");
  const ticket = filters.ticket;
  const ticketNumber = ticket ? Number(ticket.replace("#", "")) : NaN;
  const searchByNumber = Number.isInteger(ticketNumber) && ticketNumber > 0;

  return {
    userId,
    status: { not: "VOIDED" },
    ...(filters.billable === "billable" ? { billable: true } : {}),
    ...(filters.billable === "non-billable" ? { billable: false } : {}),
    ...(project?.[0] === "cost-center" && project[1]
      ? { costCenterId: project[1] }
      : {}),
    ...(project?.[0] === "manual" && project[1]
      ? { manualProjectId: project[1] }
      : {}),
    ...(ticket
      ? {
          OR: [
            { description: { contains: ticket, mode: "insensitive" } },
            {
              ticket: {
                externalReference: { contains: ticket, mode: "insensitive" },
              },
            },
            ...(searchByNumber
              ? [
                  { ticket: { number: ticketNumber } },
                  { ticketNumberSnapshot: ticketNumber },
                ]
              : []),
          ],
        }
      : {}),
  };
}

export function summarizeTimeEntries(
  entries: Array<{
    durationSeconds: number;
    billable: boolean;
    projectNameSnapshot: string | null;
    status: string;
  }>,
) {
  const byProject = new Map<string, number>();
  let week = 0;
  let billable = 0;
  let nonBillable = 0;

  for (const entry of entries) {
    week += entry.durationSeconds;
    if (entry.billable) billable += entry.durationSeconds;
    else nonBillable += entry.durationSeconds;
    const project =
      entry.status === "PENDING_CLASSIFICATION"
        ? "Pendente de classificação"
        : (entry.projectNameSnapshot ?? "Pendente de classificação");
    byProject.set(
      project,
      (byProject.get(project) ?? 0) + entry.durationSeconds,
    );
  }

  return {
    week,
    billable,
    nonBillable,
    byProject: Array.from(byProject.entries())
      .map(([project, seconds]) => ({ project, seconds }))
      .sort((left, right) => right.seconds - left.seconds),
  };
}

export function formatWeekParam(weekStart: Date) {
  return format(weekStart, "yyyy-MM-dd");
}

export function groupTimeEntriesByDay<
  T extends { startedAt: string | Date; durationSeconds: number },
>(entries: T[]) {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
    }).format(new Date(entry.startedAt));
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return Array.from(groups.entries()).map(([day, dayEntries]) => [
    day,
    [...dayEntries].sort((left, right) => {
      if (right.durationSeconds !== left.durationSeconds) {
        return right.durationSeconds - left.durationSeconds;
      }
      return (
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
      );
    }),
  ]) as Array<[string, T[]]>;
}

export function todayBounds(now = new Date()) {
  const from = startOfDay(now);
  return { from, to: addDays(from, 1) };
}

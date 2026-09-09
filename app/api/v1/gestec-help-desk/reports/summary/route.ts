import { requirePermission } from "@/lib/auth/session";
import { reportFilters } from "@/lib/domain/report-query";
import { errorResponse } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requirePermission("reports:view");
    const { searchParams } = new URL(request.url);
    const { from, to, where } = reportFilters(searchParams);
    const [ticketsByStatus, entries, evaluations] = await Promise.all([
      prisma.ticket.groupBy({
        by: ["status"],
        _count: true,
        where: { openedAt: { gte: from, lte: to } },
      }),
      prisma.timeEntry.findMany({
        where,
        select: {
          durationSeconds: true,
          billable: true,
          projectNameSnapshot: true,
        },
      }),
      prisma.ticketEvaluation.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _avg: { score: true },
        _count: true,
      }),
    ]);
    const totalSeconds = entries.reduce(
      (sum, item) => sum + item.durationSeconds,
      0,
    );
    const billableSeconds = entries
      .filter((item) => item.billable)
      .reduce((sum, item) => sum + item.durationSeconds, 0);
    const byProject = Object.entries(
      entries.reduce<Record<string, number>>((accumulator, item) => {
        const key = item.projectNameSnapshot ?? "Pendente de classificação";
        accumulator[key] = (accumulator[key] ?? 0) + item.durationSeconds;
        return accumulator;
      }, {}),
    ).map(([project, durationSeconds]) => ({ project, durationSeconds }));
    return Response.json({
      from,
      to,
      ticketsByStatus,
      totalSeconds,
      billableSeconds,
      nonBillableSeconds: totalSeconds - billableSeconds,
      byProject,
      nps: evaluations,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

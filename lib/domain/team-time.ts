import { TimeEntryStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listTeamMonthHours(input: {
  monthFrom: Date;
  monthTo: Date;
  userId?: string;
}) {
  const grouped = await prisma.timeEntry.groupBy({
    by: ["userId"],
    where: {
      status: { not: TimeEntryStatus.VOIDED },
      startedAt: { gte: input.monthFrom, lt: input.monthTo },
      ...(input.userId ? { userId: input.userId } : {}),
    },
    _sum: { durationSeconds: true },
  });

  if (grouped.length === 0) return [];

  const users = await prisma.userRef.findMany({
    where: { id: { in: grouped.map((row) => row.userId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  return grouped
    .map((row) => ({
      userId: row.userId,
      name: byId.get(row.userId)?.name ?? "Usuário",
      email: byId.get(row.userId)?.email ?? "",
      seconds: row._sum.durationSeconds ?? 0,
    }))
    .sort((left, right) => right.seconds - left.seconds);
}

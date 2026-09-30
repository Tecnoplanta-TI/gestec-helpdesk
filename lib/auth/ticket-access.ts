import type { Prisma, UserRole } from "@prisma/client";

import { hasPermission } from "@/lib/auth/permissions";
import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export function ticketVisibilityWhere(input: {
  userId: string;
  role: UserRole;
}): Prisma.TicketWhereInput {
  if (!hasPermission(input.role, "tickets:view")) {
    return { id: { in: [] } };
  }
  if (
    hasPermission(input.role, "tickets:manage") ||
    input.role === "AUDITOR"
  ) {
    return {};
  }
  return {
    OR: [
      { assigneeId: input.userId },
      { requesterId: input.userId },
      {
        participants: {
          some: { userId: input.userId, removedAt: null },
        },
      },
    ],
  };
}

export function withTicketVisibility(
  where: Prisma.TicketWhereInput,
  input: { userId: string; role: UserRole },
): Prisma.TicketWhereInput {
  return { AND: [where, ticketVisibilityWhere(input)] };
}

export async function assertTicketVisible(
  input: { userId: string; role: UserRole },
  ticketId: string,
) {
  const ticket = await prisma.ticket.findFirst({
    where: withTicketVisibility({ id: ticketId }, input),
    select: { id: true },
  });
  if (!ticket) {
    throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
  }
}

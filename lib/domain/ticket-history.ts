import type { Prisma, TicketStatus } from "@prisma/client";

export async function addTicketHistory(
  transaction: Prisma.TransactionClient,
  input: {
    ticketId: string;
    action: string;
    actorId?: string;
    fromStatus?: TicketStatus;
    toStatus?: TicketStatus;
    details?: Prisma.InputJsonValue;
  },
) {
  return transaction.ticketHistory.create({ data: input });
}

import { requirePermission } from "@/lib/auth/session";
import { applyTicketBatch } from "@/lib/domain/operations";
import { ticketBatchSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("tickets:manage");
    const input = ticketBatchSchema.parse(await readJson(request));
    const result = await applyTicketBatch({
      actorId: session.userId,
      action: input.action,
      ticketIds: input.ticketIds,
      requestKey: input.requestKey,
      reason: input.reason,
      assigneeId: input.assigneeId,
      priority: input.priority,
      status: input.status,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { assignTicket } from "@/lib/domain/operations";
import { assignTicketSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = assignTicketSchema.parse(await readJson(request));
    const ticket = await assignTicket({
      ticketId: id,
      actorId: session.userId,
      assigneeId: input.assigneeId,
      reason: input.reason,
      version: input.version,
      canManage: hasPermission(session.role, "tickets:manage"),
    });
    return Response.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}

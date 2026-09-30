import { requirePermission } from "@/lib/auth/session";
import { assertTicketVisible } from "@/lib/auth/ticket-access";
import { retryTicketZeevSync } from "@/lib/domain/tickets";
import { errorResponse } from "@/lib/http/api-error";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; executionId: string }> },
) {
  try {
    const session = await requirePermission("tickets:manage");
    const { id, executionId } = await context.params;
    await assertTicketVisible(session, id);
    const execution = await retryTicketZeevSync({
      ticketId: id,
      executionId,
    });
    return Response.json(execution);
  } catch (error) {
    return errorResponse(error);
  }
}

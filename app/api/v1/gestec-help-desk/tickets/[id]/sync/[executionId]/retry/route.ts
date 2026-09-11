import { requirePermission } from "@/lib/auth/session";
import { retryTicketZeevSync } from "@/lib/domain/tickets";
import { errorResponse } from "@/lib/http/api-error";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; executionId: string }> },
) {
  try {
    await requirePermission("tickets:manage");
    const { id, executionId } = await context.params;
    const execution = await retryTicketZeevSync({
      ticketId: id,
      executionId,
    });
    return Response.json(execution);
  } catch (error) {
    return errorResponse(error);
  }
}

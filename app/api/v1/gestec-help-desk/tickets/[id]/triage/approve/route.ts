import { requirePermission } from "@/lib/auth/session";
import { approveTriageSchema } from "@/lib/domain/schemas";
import { approveTicketTriage } from "@/lib/domain/tickets";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:manage");
    const { id } = await context.params;
    const input = approveTriageSchema.parse(await readJson(request));
    const ticket = await approveTicketTriage({
      ticketId: id,
      actorId: session.userId,
      ...input,
    });
    return Response.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}

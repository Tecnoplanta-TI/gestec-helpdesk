import { requirePermission } from "@/lib/auth/session";
import { resolveTicketSchema } from "@/lib/domain/schemas";
import { resolveTicket } from "@/lib/domain/tickets";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = resolveTicketSchema.parse(await readJson(request));
    const ticket = await resolveTicket({
      ticketId: id,
      userId: session.userId,
      ...input,
    });
    return Response.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}

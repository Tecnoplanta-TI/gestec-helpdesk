import { requirePermission } from "@/lib/auth/session";
import { updateAdminTicket } from "@/lib/domain/admin";
import { adminTicketUpdateSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("admin:manage");
    const { id } = await context.params;
    const data = adminTicketUpdateSchema.parse(await readJson(request));
    const ticket = await updateAdminTicket({
      id,
      actorId: session.userId,
      data,
    });
    return Response.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}

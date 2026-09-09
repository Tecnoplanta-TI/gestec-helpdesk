import { requirePermission } from "@/lib/auth/session";
import { createAdminTicket } from "@/lib/domain/admin";
import { adminTicketCreateSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("admin:manage");
    const data = adminTicketCreateSchema.parse(await readJson(request));
    const ticket = await createAdminTicket({
      actorId: session.userId,
      data,
    });
    return Response.json(ticket, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

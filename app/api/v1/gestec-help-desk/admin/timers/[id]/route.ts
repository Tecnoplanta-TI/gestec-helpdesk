import { requirePermission } from "@/lib/auth/session";
import { deleteAdminTimer } from "@/lib/domain/admin";
import { errorResponse } from "@/lib/http/api-error";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("admin:manage");
    const { id } = await context.params;
    const timer = await deleteAdminTimer({ id, actorId: session.userId });
    return Response.json(timer);
  } catch (error) {
    return errorResponse(error);
  }
}

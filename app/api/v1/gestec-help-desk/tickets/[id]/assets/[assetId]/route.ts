import { requirePermission } from "@/lib/auth/session";
import { unlinkTicketAsset } from "@/lib/domain/operations";
import { errorResponse } from "@/lib/http/api-error";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; assetId: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id, assetId } = await context.params;
    await unlinkTicketAsset({ ticketId: id, assetId, actorId: session.userId });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

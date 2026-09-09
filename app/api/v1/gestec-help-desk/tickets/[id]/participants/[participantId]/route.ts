import { requirePermission } from "@/lib/auth/session";
import { removeParticipant } from "@/lib/domain/operations";
import { errorResponse } from "@/lib/http/api-error";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; participantId: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id, participantId } = await context.params;
    await removeParticipant({
      ticketId: id,
      participantId,
      actorId: session.userId,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

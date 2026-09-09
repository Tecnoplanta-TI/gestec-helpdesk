import { requirePermission } from "@/lib/auth/session";
import { addParticipant } from "@/lib/domain/operations";
import { participantSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = participantSchema.parse(await readJson(request));
    const participant = await addParticipant({
      ticketId: id,
      actorId: session.userId,
      userId: input.userId,
      role: input.role,
    });
    return Response.json(participant, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

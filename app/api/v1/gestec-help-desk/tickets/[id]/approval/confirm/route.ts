import { requirePermission } from "@/lib/auth/session";
import { approveConclusionSchema } from "@/lib/domain/schemas";
import { approveTicketConclusion } from "@/lib/domain/tickets";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = approveConclusionSchema.parse(await readJson(request));
    return Response.json(
      await approveTicketConclusion({
        ticketId: id,
        userId: session.userId,
        ...input,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

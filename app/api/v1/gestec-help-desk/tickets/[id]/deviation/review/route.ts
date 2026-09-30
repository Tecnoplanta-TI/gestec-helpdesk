import { requirePermission } from "@/lib/auth/session";
import { assertTicketVisible } from "@/lib/auth/ticket-access";
import { deviationReviewSchema } from "@/lib/domain/schemas";
import { reviewTicketDeviation } from "@/lib/domain/tickets";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    await assertTicketVisible(session, id);
    const input = deviationReviewSchema.parse(await readJson(request));
    return Response.json(
      await reviewTicketDeviation({
        ticketId: id,
        userId: session.userId,
        ...input,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

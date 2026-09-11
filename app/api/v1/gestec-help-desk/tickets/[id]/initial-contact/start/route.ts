import { requirePermission } from "@/lib/auth/session";
import { initialContactStartSchema } from "@/lib/domain/schemas";
import { startTicketWork } from "@/lib/domain/tickets";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = initialContactStartSchema.parse(await readJson(request));
    const period = await startTicketWork(
      id,
      session.userId,
      input.requestKey,
      input.message,
    );
    return Response.json(period, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

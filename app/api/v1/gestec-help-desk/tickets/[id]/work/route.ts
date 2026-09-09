import { z } from "zod";

import { requirePermission } from "@/lib/auth/session";
import { startTicketWork, stopTicketWork } from "@/lib/domain/tickets";
import { errorResponse, readJson } from "@/lib/http/api-error";

const actionSchema = z.object({
  action: z.enum(["start", "stop"]),
  requestKey: z.string().trim().min(8).max(200),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = actionSchema.parse(await readJson(request));
    const period =
      input.action === "start"
        ? await startTicketWork(id, session.userId, input.requestKey)
        : await stopTicketWork(id, session.userId, input.requestKey);
    return Response.json(period);
  } catch (error) {
    return errorResponse(error);
  }
}

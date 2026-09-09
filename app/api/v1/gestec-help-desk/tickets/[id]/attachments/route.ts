import { requirePermission } from "@/lib/auth/session";
import { saveTicketAttachment } from "@/lib/domain/attachments";
import { ApiError, errorResponse } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    const requestKey = form.get("requestKey");
    if (!(file instanceof File))
      throw new ApiError(
        400,
        "FILE_REQUIRED",
        "Envie um arquivo no campo file.",
      );
    if (typeof requestKey !== "string" || requestKey.trim().length < 8) {
      throw new ApiError(
        400,
        "IDEMPOTENCY_REQUIRED",
        "Envie uma chave de requisição válida.",
      );
    }
    const attachment = await saveTicketAttachment({
      ticketId: id,
      userId: session.userId,
      file,
      requestKey: requestKey.trim(),
    });
    return Response.json(attachment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { readFile } from "node:fs/promises";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import {
  getAttachmentFile,
  removeTicketAttachment,
} from "@/lib/domain/attachments";
import { ApiError, errorResponse } from "@/lib/http/api-error";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    await requirePermission("tickets:view");
    const { id, attachmentId } = await context.params;
    const { attachment, absolutePath } = await getAttachmentFile(attachmentId);
    if (attachment.ticketId !== id)
      throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Anexo não encontrado.");
    const bytes = await readFile(absolutePath);
    const fallbackName =
      attachment.originalName.replace(/[^a-zA-Z0-9._-]/g, "_") || "anexo";
    return new Response(bytes, {
      headers: {
        "content-type": attachment.mimeType,
        "content-disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id, attachmentId } = await context.params;
    await removeTicketAttachment({
      attachmentId,
      ticketId: id,
      userId: session.userId,
      canManage: hasPermission(session.role, "tickets:manage"),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { requirePermission } from "@/lib/auth/session";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("notifications:view");
    const { id } = await context.params;
    const result = await prisma.notification.updateMany({
      where: { id, recipientId: session.userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notificação não encontrada.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

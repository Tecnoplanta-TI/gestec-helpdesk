import { requirePermission } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await requirePermission("notifications:view");
    await prisma.notification.updateMany({
      where: { recipientId: session.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { requirePermission } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("notifications:view");
    const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";
    const notifications = await prisma.notification.findMany({
      where: { recipientId: session.userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json(notifications);
  } catch (error) {
    return errorResponse(error);
  }
}

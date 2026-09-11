import { NotificationCenter } from "@/components/notifications/notification-center";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WorkboxPage() {
  const session = await requirePermission("notifications:view");
  const notifications = await prisma.notification.findMany({ where: { recipientId: session.userId }, orderBy: { createdAt: "desc" }, take: 100 });
  return <NotificationCenter initialNotifications={notifications.map((item) => ({ ...item, readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() }))} />;
}

import { NotificationCenter } from "@/components/notifications/notification-center";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await requirePermission("notifications:view");
  const notifications = await prisma.notification.findMany({
    where: { recipientId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <NotificationCenter
      initialNotifications={notifications.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        source: item.source,
        priority: item.priority,
        href: item.href,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}

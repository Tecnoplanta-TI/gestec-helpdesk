import type { NotificationPriority, Prisma } from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

function safeHref(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("/gestec_help_desk/")) {
    throw new ApiError(422, "INVALID_NOTIFICATION_LINK", "O link da notificação é inválido.");
  }
  return value;
}

export async function createNotification(
  input: {
    recipientId: string;
    title: string;
    description: string;
    source: string;
    priority?: NotificationPriority;
    resourceType?: string;
    resourceId?: string;
    href?: string | null;
  },
  client: Pick<Prisma.TransactionClient, "notification"> = prisma,
) {
  return client.notification.create({
    data: { ...input, href: safeHref(input.href) },
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { recipientId: userId, readAt: null } });
}

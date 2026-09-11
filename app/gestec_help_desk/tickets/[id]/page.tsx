import { notFound } from "next/navigation";

import { TicketWorkspace } from "@/components/tickets/ticket-workspace";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { listAssignableUsers } from "@/lib/domain/users";
import { ticketInclude } from "@/lib/domain/tickets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("tickets:view");
  const { id } = await params;
  const [ticket, costCenters, users, assets, services, serviceGroups] = await Promise.all([
    prisma.ticket.findUnique({ where: { id }, include: ticketInclude }),
    prisma.costCenter.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    listAssignableUsers(),
    prisma.asset.findMany({
      orderBy: { name: "asc" },
      select: { id: true, assetTag: true, name: true },
    }),
    prisma.service.findMany({
      where: { active: true, group: { active: true } },
      select: {
        id: true,
        name: true,
        code: true,
        group: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.serviceGroup.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!ticket) notFound();
  return (
    <TicketWorkspace
      ticket={JSON.parse(JSON.stringify(ticket))}
      costCenters={costCenters}
      users={users}
      assets={assets}
      services={services}
      serviceGroups={serviceGroups.map((group) => group.name)}
      currentUserId={session.userId}
      canManageTickets={hasPermission(session.role, "tickets:manage")}
    />
  );
}

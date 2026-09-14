import { notFound } from "next/navigation";

import { AdminTicketForm } from "@/components/admin/ticket-form";
import { requirePagePermission } from "@/lib/auth/page-session";
import { ticketInclude } from "@/lib/domain/tickets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("admin:manage");
  const { id } = await params;
  const [ticket, users, costCenters, services, serviceGroups] =
    await Promise.all([
      prisma.ticket.findUnique({
        where: { id },
        include: ticketInclude,
      }),
      prisma.userRef.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.costCenter.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      prisma.service.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          group: { select: { name: true } },
        },
      }),
      prisma.serviceGroup.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);
  if (!ticket) notFound();

  return (
    <AdminTicketForm
      ticket={JSON.parse(JSON.stringify(ticket))}
      users={users}
      costCenters={costCenters}
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
        groupName: service.group.name,
      }))}
      serviceGroups={serviceGroups.map((group) => group.name)}
    />
  );
}

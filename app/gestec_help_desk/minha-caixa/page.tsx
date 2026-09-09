import Link from "next/link";
import { ParticipantRole, TicketStatus } from "@prisma/client";

import { TicketQueue } from "@/components/tickets/ticket-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { listAssignableUsers } from "@/lib/domain/users";
import {
  parseTicketFilters,
  ticketSearchWhere,
} from "@/lib/domain/ticket-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "assigned", label: "Atribuídos a mim" },
  { id: "unassigned", label: "Não atribuídos" },
  { id: "mentioned", label: "Mencionados" },
] as const;

export default async function WorkboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("tickets:view");
  const params = await searchParams;
  const tab = tabs.some((item) => item.id === params.tab)
    ? String(params.tab)
    : "assigned";
  const filters = parseTicketFilters(params);
  const scope =
    tab === "assigned"
      ? {
          assigneeId: session.userId,
          status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        }
      : tab === "unassigned"
        ? {
            assigneeId: null,
            status: {
              notIn: [
                TicketStatus.CLOSED,
                TicketStatus.CANCELLED,
                TicketStatus.RESOLVED,
              ],
            },
          }
        : {
            participants: {
              some: {
                userId: session.userId,
                role: ParticipantRole.ADDITIONAL,
                removedAt: null,
              },
            },
          };
  const where = { AND: [ticketSearchWhere(filters), scope] };
  const [tickets, total, users, assigned, unassigned, mentioned] =
    await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          number: true,
          title: true,
          externalReference: true,
          requesterName: true,
          requestType: true,
          status: true,
          priority: true,
          openedAt: true,
          serviceDeadline: true,
          resolvedAt: true,
          closedAt: true,
          assignee: { select: { id: true, name: true } },
          costCenter: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { openedAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.ticket.count({ where }),
      listAssignableUsers(),
      prisma.ticket.count({
        where: {
          assigneeId: session.userId,
          status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        },
      }),
      prisma.ticket.count({
        where: {
          assigneeId: null,
          status: {
            notIn: [
              TicketStatus.CLOSED,
              TicketStatus.CANCELLED,
              TicketStatus.RESOLVED,
            ],
          },
        },
      }),
      prisma.ticket.count({
        where: {
          participants: {
            some: {
              userId: session.userId,
              role: ParticipantRole.ADDITIONAL,
              removedAt: null,
            },
          },
        },
      }),
    ]);
  const counts = { assigned, unassigned, mentioned };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minha Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Recorte do trabalho que exige sua ação, sem duplicar o CRUD da fila.
          </p>
        </div>
        <Button
          variant="outline"
          render={
            <Link href="/gestec_help_desk/minha-caixa" prefetch={false} />
          }
        >
          Atualizar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? "default" : "outline"}
            size="sm"
            render={
              <Link
                href={`/gestec_help_desk/minha-caixa?tab=${item.id}`}
                prefetch={false}
              />
            }
          >
            {item.label}
            <Badge variant="secondary" className="ml-2">
              {counts[item.id]}
            </Badge>
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tabs.find((item) => item.id === tab)?.label}</CardTitle>
          <CardDescription>{total} ticket(s) neste recorte.</CardDescription>
        </CardHeader>
        <CardContent>
          <TicketQueue
            tickets={tickets.map((ticket) => ({
              ...ticket,
              openedAt: ticket.openedAt.toISOString(),
              serviceDeadline: ticket.serviceDeadline?.toISOString() ?? null,
              resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
              closedAt: ticket.closedAt?.toISOString() ?? null,
            }))}
            total={total}
            page={filters.page}
            pageSize={filters.pageSize}
            query={filters.query}
            status={filters.status}
            priority={filters.priority}
            requestType={filters.requestType}
            users={users}
            canManage={hasPermission(session.role, "tickets:manage")}
            emptyLabel="Nenhum ticket nesta caixa."
            extraQuery={{ tab }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { TicketQueue } from "@/components/tickets/ticket-queue";
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

export default async function FollowRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("tickets:view");
  const filters = parseTicketFilters(await searchParams);
  const where = {
    AND: [
      ticketSearchWhere(filters),
      {
        OR: [
          { assigneeId: session.userId },
          { requesterId: session.userId },
          {
            participants: { some: { userId: session.userId, removedAt: null } },
          },
        ],
      },
    ],
  };
  const [tickets, total, users] = await Promise.all([
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
      orderBy: { openedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.ticket.count({ where }),
    listAssignableUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Acompanhar solicitações
        </h1>
        <p className="text-sm text-muted-foreground">
          Tickets em que você solicita, atende ou participa, incluindo
          encerrados.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Participação</CardTitle>
          <CardDescription>
            {total} chamado(s) no seu escopo de acompanhamento.
          </CardDescription>
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
            emptyLabel="Você ainda não participa de nenhum ticket."
          />
        </CardContent>
      </Card>
    </div>
  );
}

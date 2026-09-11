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
import {
  parseTicketFilters,
  ticketSearchWhere,
} from "@/lib/domain/ticket-query";
import { listAssignableUsers } from "@/lib/domain/users";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("tickets:view");
  const params = await searchParams;
  const filters = parseTicketFilters(params);
  const where = ticketSearchWhere(filters);
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
      orderBy: { openedAt: "asc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.ticket.count({ where }),
    listAssignableUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Fila operacional dos atendimentos recebidos do Zeev.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Fila de atendimento</CardTitle>
          <CardDescription>{total} ticket(s) no recorte atual.</CardDescription>
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
            emptyLabel="Nenhum ticket corresponde aos filtros."
          />
        </CardContent>
      </Card>
    </div>
  );
}

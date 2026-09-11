import Link from "next/link";
import { TicketStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  kanbanColumns,
  normalizeRequestType,
  requestTypeLabels,
  slaState,
} from "@/lib/domain/request-types";
import { ticketPriorityLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  await requirePermission("tickets:view");
  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        notIn: [
          TicketStatus.CLOSED,
          TicketStatus.CANCELLED,
          TicketStatus.RESOLVED,
        ],
      },
    },
    select: {
      id: true,
      number: true,
      title: true,
      requesterName: true,
      requestType: true,
      priority: true,
      serviceDeadline: true,
      assignee: { select: { name: true } },
    },
    orderBy: { openedAt: "asc" },
  });
  const columns = kanbanColumns.map((column) => ({
    ...column,
    items: tickets.filter(
      (ticket) => normalizeRequestType(ticket.requestType) === column.type,
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Chamados ativos organizados por tipo de solicitação.
        </p>
      </div>
      <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-4">
        {columns.map((column) => (
          <Card key={column.type} className="min-w-72">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{column.label}</CardTitle>
              <Badge variant="secondary">{column.items.length}</Badge>
            </CardHeader>
            <CardContent className="flex max-h-[70vh] flex-col gap-3 overflow-auto">
              {column.items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum ticket neste tipo.
                </p>
              ) : (
                column.items.map((ticket) => {
                  const sla = slaState(ticket.serviceDeadline, false);
                  return (
                    <Link
                      key={ticket.id}
                      href={`/gestec_help_desk/tickets/${ticket.id}`}
                      prefetch={false}
                      className="rounded-xl border bg-card p-3 shadow-sm transition hover:border-ring"
                    >
                      <p className="truncate font-medium" title={`#${ticket.number} — ${ticket.title}`}>
                        #{ticket.number} — {ticket.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground" title={ticket.requesterName}>
                        {ticket.requesterName}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {ticketPriorityLabels[ticket.priority]}
                        </Badge>
                        <Badge
                          variant={
                            sla.state === "overdue"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {sla.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="sr-only">{requestTypeLabels.solicitacao}</p>
    </div>
  );
}

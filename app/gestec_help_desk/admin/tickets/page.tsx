import { AdminTicketTable } from "@/components/admin/ticket-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  parseTicketFilters,
  ticketSearchWhere,
} from "@/lib/domain/ticket-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("admin:manage");
  const filters = parseTicketFilters(await searchParams);
  const where = ticketSearchWhere(filters);
  const [tickets, total, users, costCenters] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        number: true,
        title: true,
        externalReference: true,
        requesterName: true,
        status: true,
        priority: true,
        openedAt: true,
        assignee: { select: { name: true } },
        costCenter: { select: { name: true } },
      },
      orderBy: [{ openedAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.ticket.count({ where }),
    prisma.userRef.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.costCenter.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Crie ou corrija qualquer campo, inclusive status e datas.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro completo</CardTitle>
          <CardDescription>{total} ticket(s) no recorte atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTicketTable
            tickets={tickets.map((ticket) => ({
              ...ticket,
              openedAt: ticket.openedAt.toISOString(),
            }))}
            total={total}
            page={filters.page}
            pageSize={filters.pageSize}
            query={filters.query}
            status={filters.status}
            priority={filters.priority}
            users={users}
            costCenters={costCenters}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { TicketPriority, TicketStatus } from "@/lib/client-enums";
import { HugeiconsIcon } from "@hugeicons/react";

import { AdminTicketCreateDialog } from "@/components/admin/ticket-create-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Add01Icon } from "@/lib/icons";
import {
  formatDateTime,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/format";

export type AdminTicketRow = {
  id: string;
  number: number;
  title: string;
  externalReference: string;
  requesterName: string;
  status: TicketStatus;
  priority: TicketPriority;
  openedAt: string;
  assignee: { name: string } | null;
  costCenter: { name: string } | null;
};

export function AdminTicketTable({
  tickets,
  total,
  page,
  pageSize,
  query,
  status,
  priority,
  users,
  costCenters,
}: {
  tickets: AdminTicketRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  users: Array<{ id: string; name: string }>;
  costCenters: Array<{ id: string; name: string; code: string }>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const [createOpen, setCreateOpen] = useState(false);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    params.set("page", String(nextPage));
    return `/gestec_help_desk/admin/tickets?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
          Novo ticket
        </Button>
      </div>
      <form
        className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]"
        method="get"
      >
        <Input
          name="q"
          defaultValue={query}
          placeholder="Buscar por número, título ou solicitante"
        />
        <Select
          name="status"
          defaultValue={status ?? "all"}
          items={{ all: "Todos os status", ...ticketStatusLabels }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.values(TicketStatus).map((value) => (
              <SelectItem key={value} value={value}>
                {ticketStatusLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          name="priority"
          defaultValue={priority ?? "all"}
          items={{ all: "Todas as prioridades", ...ticketPriorityLabels }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.values(TicketPriority).map((value) => (
              <SelectItem key={value} value={value}>
                {ticketPriorityLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Filtrar</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Aberto em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum ticket neste recorte.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="max-w-md">
                    <Link
                      href={`/gestec_help_desk/admin/tickets/${ticket.id}`}
                      prefetch={false}
                      className="font-medium hover:underline"
                    >
                      #{ticket.number} — {ticket.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.externalReference}
                    </p>
                  </TableCell>
                  <TableCell>{ticket.requesterName}</TableCell>
                  <TableCell>
                    {ticket.costCenter?.name ?? "Sem projeto"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {ticketStatusLabels[ticket.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ticketPriorityLabels[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.assignee?.name ?? "Não atribuído"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDateTime(ticket.openedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} ticket(s) · página {page} de {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            render={<Link href={pageHref(page - 1)} prefetch={false} />}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            render={<Link href={pageHref(page + 1)} prefetch={false} />}
          >
            Próxima
          </Button>
        </div>
      </div>
      <AdminTicketCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={users}
        costCenters={costCenters}
      />
    </div>
  );
}

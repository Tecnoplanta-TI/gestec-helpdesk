"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TicketPriority, TicketStatus } from "@/lib/client-enums";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import {
  kanbanColumns,
  normalizeRequestType,
  requestTypeLabels,
  slaState,
} from "@/lib/domain/request-types";
import {
  formatDateTime,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/format";

export type QueueTicket = {
  id: string;
  number: number;
  title: string;
  externalReference: string;
  requesterName: string;
  requestType: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  openedAt: string;
  serviceDeadline: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  assignee: { id: string; name: string } | null;
  costCenter: { name: string } | null;
};

type UserOption = { id: string; name: string };

export function TicketQueue({
  tickets,
  total,
  page,
  pageSize,
  query,
  status,
  priority,
  requestType,
  users,
  canManage,
  emptyLabel,
  extraQuery = {},
}: {
  tickets: QueueTicket[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status?: string;
  priority?: string;
  requestType?: string;
  users: UserOption[];
  canManage: boolean;
  emptyLabel: string;
  extraQuery?: Record<string, string>;
}) {
  function pageHref(nextPage: number) {
    const params = new URLSearchParams({
      q: query,
      status: status ?? "all",
      priority: priority ?? "all",
      type: requestType ?? "all",
      page: String(nextPage),
      ...extraQuery,
    });
    return `?${params.toString()}`;
  }
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"assign" | "priority" | "transition">(
    "assign",
  );
  const [assigneeId, setAssigneeId] = useState("");
  const [nextPriority, setNextPriority] = useState<TicketPriority>(
    TicketPriority.MEDIUM,
  );
  const [nextStatus, setNextStatus] = useState<TicketStatus>(
    TicketStatus.TRIAGE,
  );
  const [reason, setReason] = useState("");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const selectedTickets = useMemo(
    () => tickets.filter((ticket) => selected.includes(ticket.id)),
    [tickets, selected],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function applyBatch() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/gestec-help-desk/tickets/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            ticketIds: selected,
            requestKey: crypto.randomUUID(),
            reason,
            assigneeId: action === "assign" ? assigneeId || null : undefined,
            priority: action === "priority" ? nextPriority : undefined,
            status: action === "transition" ? nextStatus : undefined,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message);
        const failed = body.results.filter(
          (item: { ok: boolean }) => !item.ok,
        ).length;
        toast.success(
          failed
            ? `Aplicado com ${failed} falha(s) no lote.`
            : "Ação em massa aplicada.",
        );
        setOpen(false);
        setSelected([]);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível aplicar o lote.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_11rem_11rem_13rem_auto]">
        {Object.entries(extraQuery).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Input
          name="q"
          defaultValue={query}
          placeholder="Buscar por ticket, título ou solicitante"
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
        <Select
          name="type"
          defaultValue={requestType ?? "all"}
          items={{ all: "Todos os tipos", ...requestTypeLabels }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {kanbanColumns.map((column) => (
              <SelectItem key={column.type} value={column.type}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Aplicar filtros</Button>
      </form>

      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selected.length} selecionado(s) de {total}.
          </p>
          <Button
            disabled={selected.length === 0}
            onClick={() => setOpen(true)}
          >
            Ações em massa
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table className="min-w-[72rem] table-fixed">
          <TableHeader>
            <TableRow>
              {canManage && <TableHead className="w-10" />}
              <TableHead className="w-[24rem]">Ticket</TableHead>
              <TableHead className="w-40">Solicitante</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-48">Centro de custo</TableHead>
              <TableHead className="w-28">Prioridade</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-40">SLA</TableHead>
              <TableHead className="w-40">Responsável</TableHead>
              <TableHead className="w-40 text-right">Aberto em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 10 : 9}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const sla = slaState(
                  ticket.serviceDeadline,
                  Boolean(ticket.resolvedAt || ticket.closedAt),
                );
                return (
                  <TableRow key={ticket.id}>
                    {canManage && (
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(ticket.id)}
                          onCheckedChange={() => toggle(ticket.id)}
                          aria-label={`Selecionar ticket ${ticket.number}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link
                        href={`/gestec_help_desk/tickets/${ticket.id}`}
                        prefetch={false}
                        className="block truncate font-medium hover:underline"
                        title={`#${ticket.number} — ${ticket.title}`}
                      >
                        #{ticket.number} — {ticket.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.externalReference}
                      </p>
                    </TableCell>
                    <TableCell
                      className="truncate"
                      title={ticket.requesterName}
                    >
                      {ticket.requesterName}
                    </TableCell>
                    <TableCell className="truncate">
                      {
                        requestTypeLabels[
                          normalizeRequestType(ticket.requestType)
                        ]
                      }
                    </TableCell>
                    <TableCell className="truncate">
                      {ticket.costCenter?.name ?? (
                        <span className="text-destructive">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ticketPriorityLabels[ticket.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ticket.status === "REOPENED_LOW_SCORE"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {ticketStatusLabels[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sla.state === "overdue" ? "destructive" : "outline"
                        }
                      >
                        {sla.label}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="truncate"
                      title={ticket.assignee?.name ?? "Não atribuído"}
                    >
                      {ticket.assignee?.name ?? "Não atribuído"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDateTime(ticket.openedAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {page} de {pages}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ações em massa</DialogTitle>
            <DialogDescription>
              Pré-validação por ticket. Sucesso parcial permanece visível.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Ação</FieldLabel>
            <Select
              value={action}
              onValueChange={(value) =>
                setAction((value ?? "assign") as typeof action)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign">Atribuir responsável</SelectItem>
                <SelectItem value="priority">Alterar prioridade</SelectItem>
                <SelectItem value="transition">Transição de status</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {action === "assign" && (
            <Field>
              <FieldLabel>Responsável</FieldLabel>
              <Select
                value={assigneeId}
                onValueChange={(value) => setAssigneeId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      users.find((user) => user.id === value)?.name ??
                      "Selecionar"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {action === "priority" && (
            <Field>
              <FieldLabel>Prioridade</FieldLabel>
              <Select
                value={nextPriority}
                onValueChange={(value) =>
                  setNextPriority((value ?? nextPriority) as TicketPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TicketPriority).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ticketPriorityLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {action === "transition" && (
            <Field>
              <FieldLabel>Novo status</FieldLabel>
              <Select
                value={nextStatus}
                onValueChange={(value) =>
                  setNextStatus((value ?? nextStatus) as TicketStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAGE">Triagem</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em atendimento</SelectItem>
                  <SelectItem value="WAITING_REQUESTER">
                    Aguardando solicitante
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="batch-reason">Motivo</FieldLabel>
            <Textarea
              id="batch-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <div className="max-h-40 overflow-auto rounded-lg border text-sm">
            {selectedTickets.map((ticket) => (
              <p key={ticket.id} className="border-b px-3 py-2 last:border-0">
                #{ticket.number} · {ticketStatusLabels[ticket.status]} ·{" "}
                {ticket.assignee?.name ?? "sem responsável"}
              </p>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              disabled={pending || reason.trim().length < 3}
              onClick={applyBatch}
            >
              {pending ? "Aplicando…" : "Confirmar e aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

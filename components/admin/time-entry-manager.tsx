"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimeEntrySource, TimeEntryStatus } from "@/lib/client-enums";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProjectCombobox,
  type TimeProject,
} from "@/components/time/project-combobox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Add01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  formatDateTime,
  formatHoursMinutes,
  timeEntrySourceLabels,
  timeEntryStatusLabels,
  toDatetimeLocalValue,
} from "@/lib/format";
import { apiRequest } from "@/lib/http/client";
import { composeProjectId } from "@/lib/domain/time-query";

export type AdminTimeEntry = {
  id: string;
  description: string;
  billable: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  status: TimeEntryStatus;
  source: TimeEntrySource;
  version: number;
  userId: string;
  ticketId: string | null;
  costCenterId: string | null;
  manualProjectId: string | null;
  user: { name: string };
  ticket: { number: number } | null;
  projectNameSnapshot: string | null;
};

export function AdminTimeEntryManager({
  entries,
  users,
  projects,
  currentUserId,
}: {
  entries: AdminTimeEntry[];
  users: Array<{ id: string; name: string }>;
  projects: TimeProject[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminTimeEntry | null>(null);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState<{
    userId: string;
    description: string;
    projectId: string;
    ticketId: string;
    billable: boolean;
    startedAt: string;
    endedAt: string;
    status: TimeEntryStatus;
    source: TimeEntrySource;
  }>({
    userId: "",
    description: "",
    projectId: "",
    ticketId: "",
    billable: false,
    startedAt: "",
    endedAt: "",
    status: TimeEntryStatus.VALID,
    source: TimeEntrySource.MANUAL,
  });

  function open(entry: AdminTimeEntry) {
    setCreating(false);
    setEditing(entry);
    setReason("");
    setForm({
      userId: entry.userId,
      description: entry.description,
      projectId: composeProjectId(entry) || projects[0]?.id || "",
      ticketId: entry.ticketId ?? "",
      billable: entry.billable,
      startedAt: toDatetimeLocalValue(entry.startedAt),
      endedAt: toDatetimeLocalValue(entry.endedAt),
      status: entry.status,
      source: entry.source,
    });
  }

  function openCreate() {
    const now = new Date();
    const started = new Date(now.getTime() - 60 * 60 * 1000);
    setEditing(null);
    setCreating(true);
    setReason("");
    setForm({
      userId: currentUserId,
      description: "",
      projectId: projects[0]?.id || "",
      ticketId: "",
      billable: false,
      startedAt: toDatetimeLocalValue(started),
      endedAt: toDatetimeLocalValue(now),
      status: TimeEntryStatus.VALID,
      source: TimeEntrySource.MANUAL,
    });
  }

  function closeSheet() {
    setEditing(null);
    setCreating(false);
  }

  function save() {
    startTransition(async () => {
      try {
        if (creating) {
          await apiRequest("/api/v1/gestec-help-desk/admin/time-entries", {
            method: "POST",
            body: JSON.stringify({
              userId: form.userId,
              description: form.description,
              projectId: form.projectId,
              ticketId: form.ticketId.trim() ? form.ticketId.trim() : null,
              billable: form.billable,
              startedAt: new Date(form.startedAt).toISOString(),
              endedAt: new Date(form.endedAt).toISOString(),
              status: form.status,
              source: form.source,
            }),
          });
          toast.success("Apontamento criado.");
        } else if (editing) {
          await apiRequest(
            `/api/v1/gestec-help-desk/admin/time-entries/${editing.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                userId: form.userId,
                description: form.description,
                projectId: form.projectId || undefined,
                ticketId: form.ticketId.trim() ? form.ticketId.trim() : null,
                billable: form.billable,
                startedAt: new Date(form.startedAt).toISOString(),
                endedAt: new Date(form.endedAt).toISOString(),
                status: form.status,
                source: form.source,
                correctionReason: reason,
                version: editing.version,
              }),
            },
          );
          toast.success("Apontamento atualizado.");
        }
        closeSheet();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={projects.length === 0}>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
          Novo apontamento
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Pessoa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Centro de custo / projeto</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum apontamento no período.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="tabular-nums">
                    {formatDateTime(entry.startedAt)}
                  </TableCell>
                  <TableCell>{entry.user.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description}
                    {entry.ticket ? (
                      <span className="block text-xs text-muted-foreground">
                        Ticket #{entry.ticket.number}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {entry.projectNameSnapshot ?? "Sem projeto"}
                  </TableCell>
                  <TableCell>
                    {formatHoursMinutes(entry.durationSeconds)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "VOIDED" ? "outline" : "secondary"
                      }
                    >
                      {timeEntryStatusLabels[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => open(entry)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={creating || Boolean(editing)}
        onOpenChange={(openSheet) => {
          if (!openSheet) closeSheet();
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {creating ? "Novo apontamento" : "Corrigir apontamento"}
            </SheetTitle>
            <SheetDescription>
              {creating
                ? "Lance horas de qualquer pessoa em qualquer projeto."
                : "A duração é recalculada pelas datas. Informe o motivo."}
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="px-4">
            <Field>
              <FieldLabel>Pessoa</FieldLabel>
              <Select
                value={form.userId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    userId: value ?? current.userId,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      users.find((user) => user.id === value)?.name ?? "Pessoa"
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
            <Field>
              <FieldLabel htmlFor="admin-time-description">
                Descrição
              </FieldLabel>
              <Input
                id="admin-time-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Centro de custo ou projeto</FieldLabel>
              <ProjectCombobox
                projects={projects}
                recentProjectIds={[]}
                value={form.projectId}
                onChange={(projectId) => {
                  const project = projects.find((item) => item.id === projectId);
                  setForm((current) => ({
                    ...current,
                    projectId,
                    billable: project?.billableByDefault ?? current.billable,
                  }));
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-time-ticket">Ticket (UUID)</FieldLabel>
              <Input
                id="admin-time-ticket"
                value={form.ticketId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ticketId: event.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-time-start">Início</FieldLabel>
              <Input
                id="admin-time-start"
                type="datetime-local"
                value={form.startedAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startedAt: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-time-end">Fim</FieldLabel>
              <Input
                id="admin-time-end"
                type="datetime-local"
                value={form.endedAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endedAt: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: (value ?? current.status) as TimeEntryStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      timeEntryStatusLabels[String(value)] ?? "Status"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TimeEntryStatus).map((value) => (
                    <SelectItem key={value} value={value}>
                      {timeEntryStatusLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Origem</FieldLabel>
              <Select
                value={form.source}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    source: (value ?? current.source) as TimeEntrySource,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      timeEntrySourceLabels[String(value)] ?? "Origem"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TimeEntrySource).map((value) => (
                    <SelectItem key={value} value={value}>
                      {timeEntrySourceLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Faturável</FieldLabel>
              <Switch
                checked={form.billable}
                onCheckedChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    billable: Boolean(value),
                  }))
                }
              />
            </Field>
            {creating ? null : (
              <Field>
                <FieldLabel htmlFor="admin-time-reason">Motivo</FieldLabel>
                <Textarea
                  id="admin-time-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Field>
            )}
          </FieldGroup>
          <SheetFooter>
            <Button
              disabled={
                pending ||
                !form.description.trim() ||
                !form.projectId ||
                (!creating && reason.trim().length < 3)
              }
              onClick={save}
            >
              {pending ? "Salvando…" : creating ? "Criar" : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

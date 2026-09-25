"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimeEntrySource, TimeEntryStatus } from "@/lib/client-enums";
import { toast } from "sonner";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Add01Icon, MoreVerticalIcon } from "@/lib/icons";
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

type BulkFields = {
  description: boolean;
  user: boolean;
  project: boolean;
  billable: boolean;
  time: boolean;
  date: boolean;
};

type BulkTargetEntry = {
  id: string;
  version: number;
  startedAt?: string;
  endedAt?: string;
};

function localDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTimeInputValue(value: Date) {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function localDateTimeIso(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

function addDaysToDateInput(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return localDateInputValue(next);
}

function localDayOffset(startedAt: Date, endedAt: Date) {
  const startDay = Date.UTC(
    startedAt.getFullYear(),
    startedAt.getMonth(),
    startedAt.getDate(),
  );
  const endDay = Date.UTC(
    endedAt.getFullYear(),
    endedAt.getMonth(),
    endedAt.getDate(),
  );
  return Math.round((endDay - startDay) / 86_400_000);
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkFields, setBulkFields] = useState<BulkFields>({
    description: false,
    user: false,
    project: false,
    billable: false,
    time: false,
    date: false,
  });
  const [bulkUserId, setBulkUserId] = useState("");
  const [bulkProjectId, setBulkProjectId] = useState("");
  const [bulkBillable, setBulkBillable] = useState(false);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkStartedTime, setBulkStartedTime] = useState("");
  const [bulkEndedTime, setBulkEndedTime] = useState("");
  const [deleteEntries, setDeleteEntries] = useState<AdminTimeEntry[] | null>(
    null,
  );
  const [deleteReason, setDeleteReason] = useState("");
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

  function duplicate(entry: AdminTimeEntry) {
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/admin/time-entries/${entry.id}/duplicate`,
          {
            method: "POST",
            body: JSON.stringify({ version: entry.version }),
          },
        );
        toast.success("Apontamento duplicado com os mesmos dados.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível duplicar o apontamento.",
        );
      }
    });
  }

  function closeSheet() {
    setEditing(null);
    setCreating(false);
  }

  const selectedEntries = entries.filter((entry) => selectedIds.has(entry.id));
  const selectableEntries = entries.filter(
    (entry) => entry.status !== TimeEntryStatus.VOIDED,
  );
  const allSelectableSelected =
    selectableEntries.length > 0 &&
    selectableEntries.every((entry) => selectedIds.has(entry.id));
  const someSelectableSelected = selectableEntries.some((entry) =>
    selectedIds.has(entry.id),
  );

  function toggleEntry(entryId: string, checked: boolean | "indeterminate") {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(entryId);
      else next.delete(entryId);
      return next;
    });
  }

  function resetBulkForm() {
    setBulkFields({
      description: false,
      user: false,
      project: false,
      billable: false,
      time: false,
      date: false,
    });
    setBulkReason("");
    setBulkDescription("");
    setBulkUserId("");
    setBulkProjectId("");
    setBulkBillable(false);
    setBulkDate("");
    setBulkStartedTime("");
    setBulkEndedTime("");
  }

  function openBulkEditor() {
    resetBulkForm();
    const first = selectedEntries[0];
    if (first) {
      setBulkDate(localDateInputValue(new Date(first.startedAt)));
      setBulkStartedTime(localTimeInputValue(new Date(first.startedAt)));
      setBulkEndedTime(localTimeInputValue(new Date(first.endedAt)));
    }
    setBulkOpen(true);
  }

  function saveBulkEdit() {
    const body: {
      entries: BulkTargetEntry[];
      correctionReason: string;
      description?: string;
      userId?: string;
      projectId?: string;
      billable?: boolean;
    } = {
      entries: selectedEntries.map((entry) => {
        const target: BulkTargetEntry = {
          id: entry.id,
          version: entry.version,
        };
        if (bulkFields.date || bulkFields.time) {
          const start = new Date(entry.startedAt);
          const end = new Date(entry.endedAt);
          const existingStartDate = localDateInputValue(start);
          const existingEndDate = localDateInputValue(end);
          const startDate = bulkFields.date ? bulkDate : existingStartDate;
          const endDate = bulkFields.date
            ? addDaysToDateInput(startDate, localDayOffset(start, end))
            : existingEndDate;
          target.startedAt = localDateTimeIso(
            startDate,
            bulkFields.time ? bulkStartedTime : localTimeInputValue(start),
          );
          target.endedAt = localDateTimeIso(
            endDate,
            bulkFields.time ? bulkEndedTime : localTimeInputValue(end),
          );
        }
        return target;
      }),
      correctionReason: bulkReason.trim(),
    };
    if (bulkFields.description) body.description = bulkDescription.trim();
    if (bulkFields.user) body.userId = bulkUserId;
    if (bulkFields.project) body.projectId = bulkProjectId;
    if (bulkFields.billable) body.billable = bulkBillable;
    startTransition(async () => {
      try {
        const result = await apiRequest<{ updated: number }>(
          "/api/v1/gestec-help-desk/admin/time-entries/bulk",
          { method: "PATCH", body: JSON.stringify(body) },
        );
        toast.success(`${result.updated} apontamento(s) atualizado(s).`);
        setBulkOpen(false);
        setSelectedIds(new Set());
        resetBulkForm();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível editar os apontamentos.",
        );
      }
    });
  }

  function confirmDelete() {
    if (!deleteEntries?.length) return;
    startTransition(async () => {
      try {
        const result = await apiRequest<{ voided: number }>(
          "/api/v1/gestec-help-desk/admin/time-entries/bulk",
          {
            method: "DELETE",
            body: JSON.stringify({
              entries: deleteEntries.map(({ id, version }) => ({
                id,
                version,
              })),
              correctionReason: deleteReason.trim(),
            }),
          },
        );
        toast.success(`${result.voided} apontamento(s) excluído(s).`);
        setDeleteEntries(null);
        setDeleteReason("");
        setSelectedIds(new Set());
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir os apontamentos.",
        );
      }
    });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {selectedEntries.length ? (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedEntries.length} selecionado(s)
              </span>
              <Button
                variant="outline"
                onClick={openBulkEditor}
                disabled={pending}
              >
                Editar em massa
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteReason("");
                  setDeleteEntries(selectedEntries);
                }}
                disabled={pending}
              >
                Excluir
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={pending}
              >
                Limpar seleção
              </Button>
            </>
          ) : null}
        </div>
        <Button onClick={() => openCreate()} disabled={projects.length === 0}>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
          Novo apontamento
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Selecionar todos os apontamentos válidos"
                  disabled={selectableEntries.length === 0}
                  checked={allSelectableSelected}
                  indeterminate={
                    !allSelectableSelected && someSelectableSelected
                  }
                  onCheckedChange={(checked) => {
                    setSelectedIds(
                      checked
                        ? new Set(selectableEntries.map((entry) => entry.id))
                        : new Set(),
                    );
                  }}
                />
              </TableHead>
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
                  colSpan={8}
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum apontamento no período.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Selecionar apontamento de ${entry.user.name}, ${formatDateTime(entry.startedAt)}`}
                      checked={selectedIds.has(entry.id)}
                      disabled={entry.status === TimeEntryStatus.VOIDED}
                      onCheckedChange={(checked) =>
                        toggleEntry(entry.id, checked === true)
                      }
                    />
                  </TableCell>
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
                    <div className="inline-flex items-center justify-end gap-1 rounded-lg border p-0.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => open(entry)}
                      >
                        Editar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Mais ações do apontamento ${entry.description || entry.id}`}
                            />
                          }
                        >
                          <HugeiconsIcon icon={MoreVerticalIcon} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-36 min-w-36 rounded-xl p-1"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              className="rounded-lg"
                              disabled={pending}
                              onClick={() => duplicate(entry)}
                            >
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="rounded-lg"
                              variant="destructive"
                              disabled={entry.status === TimeEntryStatus.VOIDED}
                              onClick={() => {
                                setDeleteReason("");
                                setDeleteEntries([entry]);
                              }}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={bulkOpen}
        onOpenChange={(openDialog) => {
          setBulkOpen(openDialog);
          if (!openDialog) resetBulkForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar apontamentos em massa</DialogTitle>
            <DialogDescription>
              Marque os campos que deseja aplicar aos {selectedEntries.length}{" "}
              apontamento(s) selecionado(s).
            </DialogDescription>
          </DialogHeader>
          <FieldSet className="gap-0">
            <FieldLegend className="sr-only">
              Campos da edição em massa
            </FieldLegend>
            <FieldGroup className="gap-0">
              <Field
                className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-3"
                orientation="horizontal"
              >
                <Checkbox
                  id="bulk-description-enabled"
                  checked={bulkFields.description}
                  onCheckedChange={(checked) =>
                    setBulkFields((value) => ({
                      ...value,
                      description: checked === true,
                    }))
                  }
                />
                <FieldLabel
                  htmlFor="bulk-description-enabled"
                  className="font-medium"
                >
                  Descrição
                </FieldLabel>
                <Input
                  value={bulkDescription}
                  onChange={(event) => setBulkDescription(event.target.value)}
                  placeholder="Adicionar descrição…"
                  maxLength={500}
                  disabled={!bulkFields.description}
                />
              </Field>
              <Field
                className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-3"
                orientation="horizontal"
              >
                <Checkbox
                  id="bulk-user-enabled"
                  checked={bulkFields.user}
                  onCheckedChange={(checked) =>
                    setBulkFields((value) => ({
                      ...value,
                      user: checked === true,
                    }))
                  }
                />
                <FieldLabel htmlFor="bulk-user-enabled" className="font-medium">
                  Pessoa
                </FieldLabel>
                <Select
                  value={bulkUserId}
                  onValueChange={(value) => setBulkUserId(value ?? "")}
                  disabled={!bulkFields.user}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) =>
                        users.find((user) => user.id === value)?.name ??
                        "Selecionar pessoa"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-3"
                orientation="horizontal"
              >
                <Checkbox
                  id="bulk-project-enabled"
                  checked={bulkFields.project}
                  onCheckedChange={(checked) =>
                    setBulkFields((value) => ({
                      ...value,
                      project: checked === true,
                    }))
                  }
                />
                <FieldLabel
                  htmlFor="bulk-project-enabled"
                  className="font-medium"
                >
                  Projeto
                </FieldLabel>
                <Select
                  value={bulkProjectId}
                  onValueChange={(value) => setBulkProjectId(value ?? "")}
                  disabled={!bulkFields.project || projects.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) =>
                        projects.find((project) => project.id === value)
                          ?.name ?? "Selecionar projeto"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-3"
                orientation="horizontal"
              >
                <Checkbox
                  id="bulk-billable-enabled"
                  checked={bulkFields.billable}
                  onCheckedChange={(checked) =>
                    setBulkFields((value) => ({
                      ...value,
                      billable: checked === true,
                    }))
                  }
                />
                <FieldLabel
                  htmlFor="bulk-billable-enabled"
                  className="font-medium"
                >
                  Faturável
                </FieldLabel>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={bulkBillable}
                    onCheckedChange={(checked) =>
                      setBulkBillable(Boolean(checked))
                    }
                    disabled={!bulkFields.billable}
                  />
                  <span className="text-sm text-muted-foreground">
                    {bulkBillable ? "Sim" : "Não"}
                  </span>
                </div>
              </Field>
              <Field
                className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-3"
                orientation="horizontal"
              >
                <Checkbox
                  id="bulk-time-enabled"
                  checked={bulkFields.time}
                  onCheckedChange={(checked) =>
                    setBulkFields((value) => ({
                      ...value,
                      time: checked === true,
                    }))
                  }
                />
                <FieldLabel htmlFor="bulk-time-enabled" className="font-medium">
                  Horário
                </FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    aria-label="Horário de início"
                    type="time"
                    value={bulkStartedTime}
                    onChange={(event) => setBulkStartedTime(event.target.value)}
                    disabled={!bulkFields.time}
                  />
                  <Input
                    aria-label="Horário de término"
                    type="time"
                    value={bulkEndedTime}
                    onChange={(event) => setBulkEndedTime(event.target.value)}
                    disabled={!bulkFields.time}
                  />
                </div>
              </Field>
              <Field
                className="grid grid-cols-[auto_6.5rem_minmax(0,1fr)] items-center gap-3 border-b py-3"
                orientation="horizontal"
              >
                <Checkbox
                  id="bulk-date-enabled"
                  checked={bulkFields.date}
                  onCheckedChange={(checked) =>
                    setBulkFields((value) => ({
                      ...value,
                      date: checked === true,
                    }))
                  }
                />
                <FieldLabel htmlFor="bulk-date-enabled" className="font-medium">
                  Data
                </FieldLabel>
                <Input
                  type="date"
                  value={bulkDate}
                  onChange={(event) => setBulkDate(event.target.value)}
                  disabled={!bulkFields.date}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
          <Field>
            <FieldLabel htmlFor="bulk-time-reason">
              Motivo da alteração
            </FieldLabel>
            <Textarea
              id="bulk-time-reason"
              value={bulkReason}
              onChange={(event) => setBulkReason(event.target.value)}
              minLength={3}
              maxLength={1000}
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              Cancelar
            </DialogClose>
            <Button
              onClick={saveBulkEdit}
              disabled={
                pending ||
                bulkReason.trim().length < 3 ||
                selectedEntries.length === 0 ||
                !Object.values(bulkFields).some(Boolean) ||
                (bulkFields.description && !bulkDescription.trim()) ||
                (bulkFields.user && !bulkUserId) ||
                (bulkFields.project && !bulkProjectId) ||
                (bulkFields.date && !bulkDate) ||
                (bulkFields.time && (!bulkStartedTime || !bulkEndedTime))
              }
            >
              {pending ? "Salvando…" : "Aplicar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteEntries)}
        onOpenChange={(openDialog) => {
          if (!openDialog) {
            setDeleteEntries(null);
            setDeleteReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir{" "}
              {deleteEntries?.length === 1 ? "apontamento" : "apontamentos"}?
            </DialogTitle>
            <DialogDescription>
              Os registros serão invalidados e permanecerão no histórico de
              auditoria. Informe o motivo para continuar.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="delete-time-reason">
              Motivo da exclusão
            </FieldLabel>
            <Textarea
              id="delete-time-reason"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              minLength={3}
              maxLength={1000}
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending || deleteReason.trim().length < 3}
            >
              {pending ? "Excluindo…" : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  const project = projects.find(
                    (item) => item.id === projectId,
                  );
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

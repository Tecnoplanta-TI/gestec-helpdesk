"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  DollarCircleIcon,
  Download01Icon,
  InformationCircleIcon,
  MoreVerticalIcon,
  PlayIcon,
  StopIcon,
} from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ProjectCombobox,
  type TimeProject,
} from "@/components/time/project-combobox";
import { CreateProjectDialog } from "@/components/time/create-project-dialog";
import { formatDuration } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";
import { groupTimeEntriesByDay } from "@/lib/domain/time-query";
import type { TimeBillableFilter } from "@/lib/domain/time-query";
import { JornadaFiltersSheet } from "@/components/time/jornada-filters-sheet";
import { JornadaHourBoxes } from "@/components/time/jornada-hour-boxes";

type ActiveTimer = {
  id: string;
  description: string;
  projectName: string;
  projectId: string;
  billable: boolean;
  startedAt: string;
  version: number;
};
type Entry = {
  id: string;
  description: string;
  projectNameSnapshot: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  billable: boolean;
  source: string;
  status: string;
  costCenterId: string | null;
  manualProjectId: string | null;
  periodCount: number;
  version: number;
  ticket: { number: number; externalReference: string } | null;
};
type WorkspaceFilters = {
  from: string;
  project: string;
  ticket: string;
  billable: TimeBillableFilter;
};
function BillableButton({
  billable,
  onChange,
  disabled = false,
}: {
  billable: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const label = billable
    ? "Marcar como não faturável"
    : "Marcar como faturável";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant={billable ? "default" : "outline"}
            disabled={disabled}
            aria-label={label}
            onClick={onChange}
          />
        }
      >
        <HugeiconsIcon
          icon={DollarCircleIcon}
          className={billable ? "fill-primary-foreground/20" : ""}
        />
      </TooltipTrigger>
      <TooltipContent>
        {billable ? "Faturável" : "Não faturável"}
      </TooltipContent>
    </Tooltip>
  );
}

function jornadaHref(filters: WorkspaceFilters) {
  const params = new URLSearchParams();
  params.set("from", filters.from);
  if (filters.project) params.set("project", filters.project);
  if (filters.ticket) params.set("ticket", filters.ticket);
  if (filters.billable !== "all") params.set("billable", filters.billable);
  return `/gestec_help_desk/jornada?${params.toString()}`;
}

export function TimeWorkspace({
  projects,
  recentProjectIds,
  activeTimer,
  entries,
  totals,
  filters,
  weekLabel,
  canWrite,
  canManageProjects,
  exportHref,
  serverNow,
  dailyGoalSeconds,
}: {
  projects: TimeProject[];
  recentProjectIds: string[];
  activeTimer: ActiveTimer | null;
  entries: Entry[];
  totals: {
    today: number;
    week: number;
    billable: number;
    nonBillable: number;
    byProject: Array<{ project: string; seconds: number }>;
  };
  filters: WorkspaceFilters;
  weekLabel: string;
  canWrite: boolean;
  canManageProjects: boolean;
  exportHref: string | null;
  serverNow: string;
  dailyGoalSeconds: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [description, setDescription] = useState(
    activeTimer?.description ?? "",
  );
  const [projectId, setProjectId] = useState(activeTimer?.projectId ?? "");
  const [billable, setBillable] = useState(activeTimer?.billable ?? false);
  const [elapsed, setElapsed] = useState(
    activeTimer
      ? Math.floor(
          (new Date(serverNow).getTime() -
            new Date(activeTimer.startedAt).getTime()) /
            1000,
        )
      : 0,
  );
  const [manualDate, setManualDate] = useState(serverNow.slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editBillable, setEditBillable] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [pendingTimerChange, setPendingTimerChange] = useState<{
    projectId?: string;
    billable?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!activeTimer) return;
    setDescription(activeTimer.description);
    setProjectId(activeTimer.projectId);
    setBillable(activeTimer.billable);
    const tick = () =>
      setElapsed(
        Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000,
          ),
        ),
      );
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeTimer]);

  const groupedEntries = useMemo(
    () => groupTimeEntriesByDay(entries),
    [entries],
  );

  function run(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a ação.",
        );
      }
    });
  }

  function navigate(next: Partial<WorkspaceFilters>) {
    router.push(jornadaHref({ ...filters, ...next }));
  }

  function shiftWeek(days: number) {
    const weekStart = new Date(`${filters.from}T12:00:00`);
    navigate({ from: format(addDays(weekStart, days), "yyyy-MM-dd") });
  }

  function start() {
    if (!canWrite) return;
    if (!description.trim())
      return toast.error("Informe a descrição da atividade.");
    if (!projectId) return toast.error("Selecione um projeto ativo.");
    run(
      () =>
        apiRequest("/api/v1/gestec-help-desk/timer", {
          method: "POST",
          body: JSON.stringify({
            description,
            projectId,
            billable,
            requestKey: crypto.randomUUID(),
          }),
        }),
      "Timer iniciado.",
    );
  }

  function stop() {
    if (!activeTimer) return;
    run(
      () =>
        apiRequest("/api/v1/gestec-help-desk/timer", {
          method: "DELETE",
          body: JSON.stringify({ timerId: activeTimer.id }),
        }),
      "Timer finalizado e apontamento criado.",
    );
  }

  function addManual() {
    if (!canWrite) return;
    if (!description.trim())
      return toast.error("Informe a descrição da atividade.");
    if (!projectId) return toast.error("Selecione um projeto ativo.");
    const startedAt = new Date(`${manualDate}T${startTime}:00`);
    const endedAt = new Date(`${manualDate}T${endTime}:00`);
    run(
      () =>
        apiRequest("/api/v1/gestec-help-desk/time-entries", {
          method: "POST",
          body: JSON.stringify({
            description,
            projectId,
            billable,
            startedAt,
            endedAt,
            requestKey: crypto.randomUUID(),
          }),
        }),
      "Apontamento manual adicionado.",
    );
  }

  function applyProjectSelection(nextProjectId: string) {
    if (activeTimer && nextProjectId !== activeTimer.projectId) {
      setPendingTimerChange({ projectId: nextProjectId });
      return;
    }
    setProjectId(nextProjectId);
    const project = projects.find((item) => item.id === nextProjectId);
    if (project && !activeTimer) setBillable(project.billableByDefault);
  }

  function applyBillableToggle() {
    if (activeTimer) {
      setPendingTimerChange({ billable: !billable });
      return;
    }
    setBillable((value) => !value);
  }

  function confirmTimerChange() {
    if (!pendingTimerChange) return;
    const nextProjectId = pendingTimerChange.projectId ?? projectId;
    const nextBillable = pendingTimerChange.billable ?? billable;
    run(async () => {
      await apiRequest("/api/v1/gestec-help-desk/timer", {
        method: "PATCH",
        body: JSON.stringify({
          projectId: pendingTimerChange.projectId,
          billable: pendingTimerChange.billable,
          version: activeTimer?.version,
        }),
      });
      setProjectId(nextProjectId);
      setBillable(nextBillable);
      setPendingTimerChange(null);
    }, "Timer atualizado.");
  }

  function restartSimilar(entry: Entry) {
    if (!canWrite) return;
    if (activeTimer)
      return toast.error("Pare o timer atual antes de reiniciar outro.");
    const nextProjectId = entry.costCenterId
      ? `cost-center:${entry.costCenterId}`
      : entry.manualProjectId
        ? `manual:${entry.manualProjectId}`
        : "";
    setMode("timer");
    setDescription(entry.description);
    setBillable(entry.billable);
    if (
      !nextProjectId ||
      !projects.some((project) => project.id === nextProjectId)
    ) {
      setProjectId("");
      return toast.error(
        "O projeto original não está disponível. Selecione outro para iniciar.",
      );
    }
    setProjectId(nextProjectId);
    run(
      () =>
        apiRequest("/api/v1/gestec-help-desk/timer", {
          method: "POST",
          body: JSON.stringify({
            description: entry.description,
            projectId: nextProjectId,
            billable: entry.billable,
            requestKey: crypto.randomUUID(),
          }),
        }),
      "Timer semelhante iniciado.",
    );
  }

  function openEdit(entry: Entry) {
    setEditingEntry(entry);
    setEditDescription(entry.description);
    setEditProjectId(
      entry.costCenterId
        ? `cost-center:${entry.costCenterId}`
        : entry.manualProjectId
          ? `manual:${entry.manualProjectId}`
          : "",
    );
    setEditBillable(entry.billable);
    setCorrectionReason("");
  }

  function updateEntry() {
    if (!editingEntry) return;
    run(async () => {
      await apiRequest(
        `/api/v1/gestec-help-desk/time-entries/${editingEntry.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            description: editDescription,
            projectId: editProjectId || undefined,
            billable: editBillable,
            correctionReason,
            version: editingEntry.version,
          }),
        },
      );
      setEditingEntry(null);
    }, "Apontamento corrigido e auditado.");
  }

  function voidEntry() {
    if (!editingEntry) return;
    run(async () => {
      await apiRequest(
        `/api/v1/gestec-help-desk/time-entries/${editingEntry.id}`,
        {
          method: "DELETE",
          body: JSON.stringify({
            correctionReason,
            version: editingEntry.version,
          }),
        },
      );
      setEditingEntry(null);
    }, "Apontamento invalidado e preservado na auditoria.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jornada</h1>
          <p className="text-sm text-muted-foreground">
            Registre e acompanhe as horas trabalhadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JornadaFiltersSheet
            filters={filters}
            projects={projects}
            recentProjectIds={recentProjectIds}
            onApply={(next) => navigate(next)}
          />
          {exportHref ? (
            <Button variant="outline" render={<a href={exportHref} download />}>
              <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} />{" "}
              Exportar
            </Button>
          ) : null}
        </div>
      </div>

      {activeTimer ? (
        <Alert className="border-primary/30 bg-primary/5">
          <HugeiconsIcon icon={InformationCircleIcon} />
          <AlertTitle>Timer em execução</AlertTitle>
          <AlertDescription>
            Somente um timer pode ficar ativo. Alterações de projeto ou
            faturabilidade exigem confirmação.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-2xl border border-foreground/15 bg-card p-3 md:p-4">
        <div className="grid items-center gap-3 xl:grid-cols-[minmax(18rem,1fr)_auto_auto_auto_auto]">
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={Boolean(activeTimer) || !canWrite}
            placeholder="Em que você está trabalhando?"
            aria-label="Descrição da atividade"
          />
          <div className="flex min-w-0 gap-2 xl:w-fit xl:max-w-96">
            <ProjectCombobox
              projects={projects}
              recentProjectIds={recentProjectIds}
              value={projectId}
              disabled={!canWrite}
              onChange={applyProjectSelection}
            />
            {canManageProjects ? (
              <CreateProjectDialog
                open={projectDialogOpen}
                onOpenChange={setProjectDialogOpen}
                onCreated={(project) => {
                  router.refresh();
                  setProjectId(project.id);
                  setBillable(project.billableByDefault);
                }}
              />
            ) : null}
          </div>
          <BillableButton
            billable={billable}
            onChange={applyBillableToggle}
            disabled={!canWrite}
          />
          {mode === "timer" ? (
            <span className="min-w-24 text-center font-mono text-lg font-semibold tabular-nums">
              {formatDuration(activeTimer ? elapsed : 0)}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                className="w-36"
                type="date"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
                disabled={!canWrite}
              />
              <Input
                className="w-24"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={!canWrite}
              />
              <span>–</span>
              <Input
                className="w-24"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={!canWrite}
              />
            </div>
          )}
          {activeTimer ? (
            <Button
              variant="destructive"
              disabled={pending || !canWrite}
              onClick={stop}
            >
              <HugeiconsIcon data-icon="inline-start" icon={StopIcon} /> Parar
            </Button>
          ) : mode === "timer" ? (
            <Button
              disabled={
                pending || !canWrite || !description.trim() || !projectId
              }
              onClick={start}
            >
              <HugeiconsIcon data-icon="inline-start" icon={PlayIcon} /> Iniciar
            </Button>
          ) : (
            <Button
              disabled={
                pending || !canWrite || !description.trim() || !projectId
              }
              onClick={addManual}
            >
              <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />{" "}
              Adicionar
            </Button>
          )}
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant={mode === "manual" ? "secondary" : "outline"}
                    size="icon"
                    disabled={Boolean(activeTimer)}
                    onClick={() =>
                      setMode((value) =>
                        value === "timer" ? "manual" : "timer",
                      )
                    }
                    aria-label={
                      mode === "timer"
                        ? "Alternar para lançamento manual"
                        : "Alternar para timer"
                    }
                  />
                }
              >
                <HugeiconsIcon icon={Clock01Icon} />
              </TooltipTrigger>
              <TooltipContent>
                {mode === "timer" ? "Lançamento manual" : "Usar timer"}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Mais ações" />
                }
              >
                <HugeiconsIcon icon={MoreVerticalIcon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.refresh()}>
                  Atualizar histórico
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <JornadaHourBoxes
        todaySeconds={totals.today}
        dailyGoalSeconds={dailyGoalSeconds}
      />

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="capitalize">{weekLabel}</CardTitle>
              <CardDescription>
                Apontamentos do maior para o menor em cada dia.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Semana anterior"
                onClick={() => shiftWeek(-7)}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate({ from: format(new Date(), "yyyy-MM-dd") })
                }
              >
                Esta semana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Próxima semana"
                onClick={() => shiftWeek(7)}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {groupedEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum apontamento nesta semana.
            </div>
          ) : (
            groupedEntries.map(([day, dayEntries]) => (
              <section key={day} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold capitalize">{day}</h2>
                  <span className="text-sm font-medium tabular-nums">
                    Total:{" "}
                    {formatDuration(
                      dayEntries.reduce(
                        (sum, entry) => sum + entry.durationSeconds,
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid items-center gap-3 border-b p-4 last:border-b-0 md:grid-cols-[minmax(16rem,1fr)_minmax(10rem,0.5fr)_auto_auto_auto_auto_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {entry.ticket ? `#${entry.ticket.number} — ` : ""}
                          {entry.description}
                        </p>
                        {entry.ticket ? (
                          <p className="text-xs text-muted-foreground">
                            {entry.ticket.externalReference}
                            {entry.periodCount > 1
                              ? ` · ${entry.periodCount} períodos`
                              : ""}
                          </p>
                        ) : null}
                        {entry.status === "PENDING_CLASSIFICATION" ? (
                          <p className="text-xs text-muted-foreground">
                            Pendente de classificação — corrija o centro de
                            custo no ticket.
                          </p>
                        ) : null}
                      </div>
                      <span className="truncate text-sm text-muted-foreground">
                        {entry.projectNameSnapshot ??
                          "Pendente de classificação"}
                      </span>
                      <span className="text-sm tabular-nums">
                        {new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(entry.startedAt))}{" "}
                        –{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(entry.endedAt))}
                      </span>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span
                              className="inline-flex size-8 items-center justify-center rounded-md border"
                              aria-label={
                                entry.billable ? "Faturável" : "Não faturável"
                              }
                            />
                          }
                        >
                          <HugeiconsIcon
                            icon={DollarCircleIcon}
                            className={
                              entry.billable
                                ? "fill-foreground/15"
                                : "opacity-40"
                            }
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {entry.billable ? "Faturável" : "Não faturável"}
                        </TooltipContent>
                      </Tooltip>
                      <Badge
                        variant="outline"
                        className="justify-center font-mono tabular-nums"
                      >
                        {formatDuration(entry.durationSeconds)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Ações do apontamento ${entry.description}`}
                            />
                          }
                        >
                          <HugeiconsIcon icon={MoreVerticalIcon} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canWrite ? (
                            <DropdownMenuItem
                              onClick={() => restartSimilar(entry)}
                            >
                              Reiniciar semelhante
                            </DropdownMenuItem>
                          ) : null}
                          {canWrite ? (
                            <DropdownMenuItem onClick={() => openEdit(entry)}>
                              Editar apontamento
                            </DropdownMenuItem>
                          ) : null}
                          {canWrite ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openEdit(entry)}
                            >
                              Invalidar apontamento
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(editingEntry)}
        onOpenChange={(value) => {
          if (!value) setEditingEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar apontamento</DialogTitle>
            <DialogDescription>
              Alterações ficam registradas na trilha de auditoria. O ticket e a
              chave de origem não são alterados.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-entry-description">
                Descrição
              </FieldLabel>
              <Input
                id="edit-entry-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Centro de custo ou projeto</FieldLabel>
              <ProjectCombobox
                projects={projects}
                recentProjectIds={recentProjectIds}
                value={editProjectId}
                onChange={setEditProjectId}
              />
            </Field>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Faturável</span>
                <span className="block text-xs text-muted-foreground">
                  Define a participação nos totais faturáveis.
                </span>
              </span>
              <Switch
                checked={editBillable}
                onCheckedChange={setEditBillable}
              />
            </label>
            <Field>
              <FieldLabel htmlFor="correction-reason">
                Motivo da correção
              </FieldLabel>
              <Input
                id="correction-reason"
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                placeholder="Informe o motivo obrigatório"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending || correctionReason.trim().length < 3}
              onClick={voidEntry}
            >
              Invalidar
            </Button>
            <Button
              disabled={
                pending ||
                editDescription.trim().length < 1 ||
                correctionReason.trim().length < 3
              }
              onClick={updateEntry}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(pendingTimerChange)}
        onOpenChange={(value) => {
          if (!value) setPendingTimerChange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar timer em andamento</DialogTitle>
            <DialogDescription>
              Centro de custo ou projeto e faturabilidade do timer ativo só
              mudam depois da confirmação. O tempo já decorrido permanece no
              mesmo apontamento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingTimerChange(null)}
            >
              Cancelar
            </Button>
            <Button disabled={pending} onClick={confirmTimerChange}>
              Confirmar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

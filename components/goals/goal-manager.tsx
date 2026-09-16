"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/catalog/confirm-delete-dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { daysInMonth, monthlyGoalSeconds } from "@/lib/domain/time-goals";
import {
  currentLocalDateValue,
  formatDateOnly,
  formatHoursMinutes,
} from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

type User = { id: string; name: string };
type Goal = {
  id: string;
  title: string;
  targetSeconds: number;
  startsOn: string;
  endsOn: string | null;
  permanent: boolean;
  active: boolean;
  targetUser: User;
  project: { name: string } | null;
  client: { name: string } | null;
};

export function GoalManager({
  goals: initialGoals,
  users,
  canManage,
}: {
  goals: Goal[];
  users: User[];
  canManage: boolean;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const today = currentLocalDateValue();
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [permanent, setPermanent] = useState(false);
  const hoursValue = Number(hours.replace(",", "."));
  const invalidHours =
    !Number.isFinite(hoursValue) || hoursValue <= 0 || hoursValue > 24;
  const invalidPeriod =
    !startsOn || (!permanent && (!endsOn || endsOn < startsOn));
  const referenceMonth = new Date(`${startsOn || today}T12:00:00`);
  const referenceMonthDays = daysInMonth(referenceMonth);
  const monthlyEquivalentSeconds = invalidHours
    ? null
    : monthlyGoalSeconds(Math.round(hoursValue * 3600), referenceMonth);
  function create() {
    startTransition(async () => {
      try {
        const goal = await apiRequest<Goal>("/api/v1/gestec-help-desk/goals", {
          method: "POST",
          body: JSON.stringify({
            title,
            targetSeconds: Math.round(hoursValue * 3600),
            startsOn,
            endsOn: permanent ? null : endsOn,
            permanent,
            targetUserId: targetId,
          }),
        });
        setGoals((current) => [goal, ...current]);
        setTitle("");
        setHours("");
        setTargetId("");
        setPermanent(false);
        toast.success("Meta criada e o usuário foi notificado.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível criar a meta.",
        );
      }
    });
  }

  function deleteGoal() {
    if (!deleting) return;
    startTransition(async () => {
      try {
        const result = await apiRequest<{ id: string }>(
          `/api/v1/gestec-help-desk/goals/${deleting.id}`,
          { method: "DELETE" },
        );
        setGoals((current) => current.filter((goal) => goal.id !== result.id));
        setDeleting(null);
        toast.success("Meta excluída definitivamente.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a meta.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Metas de horas
        </h1>
        <p className="text-sm text-muted-foreground">
          Defina metas individuais em horas por dia. O total mensal é calculado
          automaticamente pelos dias corridos de cada mês.
        </p>
      </div>
      {canManage ? (
        <section className="rounded-xl border p-4">
          <h2 className="mb-4 font-medium">Nova meta</h2>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="goal-title">Nome da meta</FieldLabel>
              <Input
                id="goal-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Entregas de setembro"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-target">Usuário</FieldLabel>
              <Select
                value={targetId}
                onValueChange={(value) => setTargetId(value ?? "")}
              >
                <SelectTrigger id="goal-target" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-hours">Meta em horas por dia</FieldLabel>
              <Input
                id="goal-hours"
                inputMode="decimal"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="Ex.: 6"
                aria-invalid={hours.length > 0 && invalidHours}
              />
              {monthlyEquivalentSeconds !== null ? (
                <FieldDescription>
                  Equivale a {formatHoursMinutes(monthlyEquivalentSeconds)} no
                  mês de vigência selecionado ({referenceMonthDays} dias).
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-start">Início</FieldLabel>
              <Input
                id="goal-start"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="goal-permanent">Meta permanente</FieldLabel>
                <FieldDescription>
                  Fica vigente até você a desativar.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="goal-permanent"
                checked={permanent}
                onCheckedChange={setPermanent}
              />
            </Field>
            {!permanent ? (
              <Field data-invalid={invalidPeriod}>
                <FieldLabel htmlFor="goal-end">Fim</FieldLabel>
                <Input
                  id="goal-end"
                  type="date"
                  value={endsOn}
                  min={startsOn}
                  onChange={(event) => setEndsOn(event.target.value)}
                  aria-invalid={invalidPeriod}
                />
              </Field>
            ) : null}
            <Button
              disabled={
                pending ||
                title.trim().length < 2 ||
                !targetId ||
                invalidHours ||
                invalidPeriod
              }
              onClick={create}
            >
              {pending ? "Criando…" : "Criar meta"}
            </Button>
          </FieldGroup>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3 border-b px-4 py-3 text-xs text-muted-foreground">
          <span>Meta</span>
          <span>Destinatário</span>
          <span>Horas por dia</span>
          <span>Status</span>
        </div>
        {goals.length ? (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <span className="min-w-0">
                <strong className="block truncate">{goal.title}</strong>
                <small className="text-muted-foreground">
                  {goal.permanent
                    ? `${formatDateOnly(goal.startsOn)} · Permanente`
                    : `${formatDateOnly(goal.startsOn)} a ${formatDateOnly(goal.endsOn!)}`}
                </small>
              </span>
              <span className="max-w-40 truncate">
                {goal.targetUser.name}
              </span>
              <span className="tabular-nums">
                {formatHoursMinutes(goal.targetSeconds)}
              </span>
              <div className="flex items-center justify-end gap-2">
                {canManage && goal.active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          const updated = await apiRequest<Goal>(
                            `/api/v1/gestec-help-desk/goals/${goal.id}`,
                            {
                              method: "PATCH",
                              body: JSON.stringify({ active: false }),
                            },
                          );
                          setGoals((current) =>
                            current.map((item) =>
                              item.id === updated.id ? updated : item,
                            ),
                          );
                          toast.success("Meta desativada.");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Não foi possível desativar a meta.",
                          );
                        }
                      });
                    }}
                  >
                    Desativar
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {goal.active ? "Ativa" : "Inativa"}
                  </span>
                )}
                {canManage ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => setDeleting(goal)}
                  >
                    Excluir
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma meta para este escopo.
          </p>
        )}
      </section>
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir meta"
        description={
          deleting
            ? `Excluir “${deleting.title}” definitivamente? Esta ação não pode ser desfeita. Para preservar o histórico, use Desativar.`
            : ""
        }
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={deleteGoal}
      />
    </div>
  );
}

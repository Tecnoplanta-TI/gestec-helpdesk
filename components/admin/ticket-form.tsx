"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TicketPriority, TicketStatus } from "@/lib/client-enums";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  kanbanColumns,
  normalizeRequestType,
} from "@/lib/domain/request-types";
import {
  formatDateTime,
  ticketHistoryLabels,
  ticketPriorityLabels,
  ticketStatusLabels,
  toDatetimeLocalValue,
} from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

export type AdminTicketFormTicket = {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  requesterName: string;
  costCenterId: string | null;
  catalogServiceId: string | null;
  requestType: string | null;
  service: string | null;
  serviceGroup: string | null;
  applicationOrProcess: string | null;
  assetCode: string | null;
  resolutionSummary: string | null;
  firstContactDeadline: string | null;
  serviceDeadline: string | null;
  openedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  externalReference: string;
  externalInstanceId: string | null;
  externalInstanceUrl: string | null;
  zeevTaskCode: string | null;
  zeevAssignmentId: string | null;
  requesterExternalId: string | null;
  requesterId: string | null;
  resolutionCycle: number;
  version: number;
  evaluations: Array<{
    score: number;
    justification: string | null;
    expectationMet: boolean | null;
    comments: string | null;
  }>;
  workPeriods: Array<{
    id: string;
    userId: string;
    cycle: number;
    startedAt: string;
    endedAt: string | null;
    pausedAt: string | null;
    valid: boolean;
    user: { name: string };
  }>;
  comments: Array<{
    id: string;
    body: string;
    internal: boolean;
    createdAt: string;
    author: { name: string };
  }>;
  history: Array<{
    id: string;
    action: string;
    createdAt: string;
    details: unknown;
  }>;
};

type Lookup = { id: string; name: string };

export function AdminTicketForm({
  ticket,
  users,
  costCenters,
  services,
}: {
  ticket: AdminTicketFormTicket;
  users: Lookup[];
  costCenters: Array<Lookup & { code: string }>;
  services: Array<Lookup & { groupName: string }>;
}) {
  const router = useRouter();
  const evaluation = ticket.evaluations[0] ?? null;
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [form, setForm] = useState({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    assigneeId: ticket.assigneeId ?? "none",
    requesterName: ticket.requesterName,
    costCenterId: ticket.costCenterId ?? "none",
    catalogServiceId: ticket.catalogServiceId ?? "none",
    requestType: ticket.requestType
      ? normalizeRequestType(ticket.requestType)
      : "solicitacao",
    service: ticket.service ?? "",
    serviceGroup: ticket.serviceGroup ?? "",
    applicationOrProcess: ticket.applicationOrProcess ?? "",
    assetCode: ticket.assetCode ?? "",
    resolutionSummary: ticket.resolutionSummary ?? "",
    firstContactDeadline: toDatetimeLocalValue(ticket.firstContactDeadline),
    serviceDeadline: toDatetimeLocalValue(ticket.serviceDeadline),
    openedAt: toDatetimeLocalValue(ticket.openedAt),
    resolvedAt: toDatetimeLocalValue(ticket.resolvedAt),
    closedAt: toDatetimeLocalValue(ticket.closedAt),
    externalReference: ticket.externalReference,
    externalInstanceId: ticket.externalInstanceId ?? "",
    externalInstanceUrl: ticket.externalInstanceUrl ?? "",
    zeevTaskCode: ticket.zeevTaskCode ?? "",
    zeevAssignmentId: ticket.zeevAssignmentId ?? "",
    requesterExternalId: ticket.requesterExternalId ?? "",
    requesterId: ticket.requesterId ?? "none",
    resolutionCycle: String(ticket.resolutionCycle),
    evaluationScore: evaluation?.score != null ? String(evaluation.score) : "",
    evaluationJustification: evaluation?.justification ?? "",
    evaluationExpectation:
      evaluation?.expectationMet == null
        ? "unset"
        : evaluation.expectationMet
          ? "yes"
          : "no",
    evaluationComments: evaluation?.comments ?? "",
  });
  const [workPeriods, setWorkPeriods] = useState(
    ticket.workPeriods.map((period) => ({
      id: period.id,
      userName: period.user.name,
      cycle: String(period.cycle),
      startedAt: toDatetimeLocalValue(period.startedAt),
      endedAt: toDatetimeLocalValue(period.endedAt),
      pausedAt: toDatetimeLocalValue(period.pausedAt),
      valid: period.valid,
    })),
  );

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toIsoOrNull(value: string) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function save() {
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/admin/tickets/${ticket.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              title: form.title,
              description: form.description,
              status: form.status,
              priority: form.priority,
              assigneeId: form.assigneeId === "none" ? null : form.assigneeId,
              requesterName: form.requesterName,
              costCenterId:
                form.costCenterId === "none" ? null : form.costCenterId,
              catalogServiceId:
                form.catalogServiceId === "none" ? null : form.catalogServiceId,
              requestType: form.requestType,
              service: form.service,
              serviceGroup: form.serviceGroup,
              applicationOrProcess: form.applicationOrProcess,
              assetCode: form.assetCode,
              resolutionSummary: form.resolutionSummary,
              firstContactDeadline: toIsoOrNull(form.firstContactDeadline),
              serviceDeadline: toIsoOrNull(form.serviceDeadline),
              openedAt: new Date(form.openedAt).toISOString(),
              resolvedAt: toIsoOrNull(form.resolvedAt),
              closedAt: toIsoOrNull(form.closedAt),
              externalReference: form.externalReference,
              externalInstanceId: form.externalInstanceId,
              externalInstanceUrl: form.externalInstanceUrl,
              zeevTaskCode: form.zeevTaskCode,
              zeevAssignmentId: form.zeevAssignmentId,
              requesterExternalId: form.requesterExternalId,
              requesterId:
                form.requesterId === "none" ? null : form.requesterId,
              resolutionCycle: Number(form.resolutionCycle),
              evaluation: form.evaluationScore.trim()
                ? {
                    score: Number(form.evaluationScore),
                    justification: form.evaluationJustification,
                    expectationMet:
                      form.evaluationExpectation === "unset"
                        ? null
                        : form.evaluationExpectation === "yes",
                    comments: form.evaluationComments,
                  }
                : null,
              workPeriods: workPeriods.map((period) => ({
                id: period.id,
                cycle: Number(period.cycle),
                startedAt: new Date(period.startedAt).toISOString(),
                endedAt: toIsoOrNull(period.endedAt),
                pausedAt: toIsoOrNull(period.pausedAt),
                valid: period.valid,
              })),
              reason,
              version: ticket.version,
            }),
          },
        );
        toast.success("Ticket atualizado.");
        setReason("");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link href="/gestec_help_desk/admin/tickets" prefetch={false} />
            }
          >
            <HugeiconsIcon data-icon="inline-start" icon={ArrowLeft01Icon} />
            Voltar
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            #{ticket.number} — {ticket.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edição administrativa. A fila operacional continua com as regras de
            transição.
          </p>
        </div>
        <Button
          variant="outline"
          render={
            <Link
              href={`/gestec_help_desk/tickets/${ticket.id}`}
              prefetch={false}
            />
          }
        >
          Abrir tela operacional
        </Button>
      </div>

      <Alert>
        <AlertTitle>Motivo obrigatório</AlertTitle>
        <AlertDescription>
          Toda correção entra no histórico do ticket e na auditoria do sistema.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
          <CardDescription>
            Versão atual {ticket.version}. Salve todas as alterações de uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="admin-ticket-title">Título</FieldLabel>
              <Input
                id="admin-ticket-title"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="admin-ticket-description">
                Descrição
              </FieldLabel>
              <Textarea
                id="admin-ticket-description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  update("status", (value ?? form.status) as TicketStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) => ticketStatusLabels[String(value)] ?? "Status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TicketStatus).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ticketStatusLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Prioridade</FieldLabel>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  update("priority", (value ?? form.priority) as TicketPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      ticketPriorityLabels[String(value)] ?? "Prioridade"
                    }
                  </SelectValue>
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
            <Field>
              <FieldLabel>Responsável</FieldLabel>
              <Select
                value={form.assigneeId}
                onValueChange={(value) => update("assigneeId", value ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      value === "none"
                        ? "Não atribuído"
                        : (users.find((user) => user.id === value)?.name ??
                          "Responsável")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-requester">
                Solicitante
              </FieldLabel>
              <Input
                id="admin-ticket-requester"
                value={form.requesterName}
                onChange={(event) =>
                  update("requesterName", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel>Usuário solicitante</FieldLabel>
              <Select
                value={form.requesterId}
                onValueChange={(value) =>
                  update("requesterId", value ?? "none")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      value === "none"
                        ? "Sem usuário vinculado"
                        : (users.find((user) => user.id === value)?.name ??
                          "Solicitante")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem usuário vinculado</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-requester-ext">
                Identificador do solicitante
              </FieldLabel>
              <Input
                id="admin-ticket-requester-ext"
                value={form.requesterExternalId}
                onChange={(event) =>
                  update("requesterExternalId", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel>Centro de custo</FieldLabel>
              <Select
                value={form.costCenterId}
                onValueChange={(value) =>
                  update("costCenterId", value ?? "none")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) => {
                      if (value === "none") return "Sem projeto";
                      const item = costCenters.find(
                        (center) => center.id === value,
                      );
                      return item
                        ? `${item.code} — ${item.name}`
                        : "Centro de custo";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem projeto</SelectItem>
                  {costCenters.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Serviço do catálogo</FieldLabel>
              <Select
                value={form.catalogServiceId}
                onValueChange={(value) =>
                  update("catalogServiceId", value ?? "none")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) => {
                      if (value === "none") return "Sem serviço";
                      const item = services.find(
                        (service) => service.id === value,
                      );
                      return item
                        ? `${item.groupName} — ${item.name}`
                        : "Serviço";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem serviço</SelectItem>
                  {services.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.groupName} — {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Select
                value={form.requestType}
                onValueChange={(value) =>
                  update("requestType", value ?? form.requestType)
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      kanbanColumns.find((column) => column.type === value)
                        ?.label ?? "Tipo"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {kanbanColumns.map((column) => (
                    <SelectItem key={column.type} value={column.type}>
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-cycle">Ciclo</FieldLabel>
              <Input
                id="admin-ticket-cycle"
                type="number"
                min={1}
                value={form.resolutionCycle}
                onChange={(event) =>
                  update("resolutionCycle", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-service">Serviço</FieldLabel>
              <Input
                id="admin-ticket-service"
                value={form.service}
                onChange={(event) => update("service", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-group">Grupo</FieldLabel>
              <Input
                id="admin-ticket-group"
                value={form.serviceGroup}
                onChange={(event) => update("serviceGroup", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-app">Aplicação</FieldLabel>
              <Input
                id="admin-ticket-app"
                value={form.applicationOrProcess}
                onChange={(event) =>
                  update("applicationOrProcess", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-asset">Ativo</FieldLabel>
              <Input
                id="admin-ticket-asset"
                value={form.assetCode}
                onChange={(event) => update("assetCode", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-external">
                Referência externa
              </FieldLabel>
              <Input
                id="admin-ticket-external"
                value={form.externalReference}
                onChange={(event) =>
                  update("externalReference", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-instance">
                ID da instância
              </FieldLabel>
              <Input
                id="admin-ticket-instance"
                value={form.externalInstanceId}
                onChange={(event) =>
                  update("externalInstanceId", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-instance-url">
                URL da instância
              </FieldLabel>
              <Input
                id="admin-ticket-instance-url"
                value={form.externalInstanceUrl}
                onChange={(event) =>
                  update("externalInstanceUrl", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-task">
                Código da tarefa
              </FieldLabel>
              <Input
                id="admin-ticket-task"
                value={form.zeevTaskCode}
                onChange={(event) => update("zeevTaskCode", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-assignment">
                ID da atribuição
              </FieldLabel>
              <Input
                id="admin-ticket-assignment"
                value={form.zeevAssignmentId}
                onChange={(event) =>
                  update("zeevAssignmentId", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-opened">Aberto em</FieldLabel>
              <Input
                id="admin-ticket-opened"
                type="datetime-local"
                value={form.openedAt}
                onChange={(event) => update("openedAt", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-first">
                Prazo do 1º contato
              </FieldLabel>
              <Input
                id="admin-ticket-first"
                type="datetime-local"
                value={form.firstContactDeadline}
                onChange={(event) =>
                  update("firstContactDeadline", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-sla">
                Prazo de serviço
              </FieldLabel>
              <Input
                id="admin-ticket-sla"
                type="datetime-local"
                value={form.serviceDeadline}
                onChange={(event) =>
                  update("serviceDeadline", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-resolved">
                Resolvido em
              </FieldLabel>
              <Input
                id="admin-ticket-resolved"
                type="datetime-local"
                value={form.resolvedAt}
                onChange={(event) => update("resolvedAt", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-closed">
                Concluído em
              </FieldLabel>
              <Input
                id="admin-ticket-closed"
                type="datetime-local"
                value={form.closedAt}
                onChange={(event) => update("closedAt", event.target.value)}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="admin-ticket-resolution">Solução</FieldLabel>
              <Textarea
                id="admin-ticket-resolution"
                value={form.resolutionSummary}
                onChange={(event) =>
                  update("resolutionSummary", event.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-ticket-score">
                Nota da avaliação
              </FieldLabel>
              <Input
                id="admin-ticket-score"
                type="number"
                min={1}
                max={10}
                value={form.evaluationScore}
                onChange={(event) =>
                  update("evaluationScore", event.target.value)
                }
                placeholder="Vazio remove a avaliação"
              />
            </Field>
            <Field>
              <FieldLabel>Atendeu a expectativa</FieldLabel>
              <Select
                value={form.evaluationExpectation}
                onValueChange={(value) =>
                  update("evaluationExpectation", value ?? "unset")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      value === "yes"
                        ? "Sim"
                        : value === "no"
                          ? "Não"
                          : "Não informado"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Não informado</SelectItem>
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="no">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="admin-ticket-justification">
                Justificativa da avaliação
              </FieldLabel>
              <Textarea
                id="admin-ticket-justification"
                value={form.evaluationJustification}
                onChange={(event) =>
                  update("evaluationJustification", event.target.value)
                }
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="admin-ticket-eval-comments">
                Comentários da avaliação
              </FieldLabel>
              <Textarea
                id="admin-ticket-eval-comments"
                value={form.evaluationComments}
                onChange={(event) =>
                  update("evaluationComments", event.target.value)
                }
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="admin-ticket-reason">
                Motivo da correção
              </FieldLabel>
              <Textarea
                id="admin-ticket-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explique o ajuste administrativo"
              />
            </Field>
          </FieldGroup>
          <div className="flex justify-end">
            <Button
              disabled={
                pending || reason.trim().length < 3 || !form.title.trim()
              }
              onClick={save}
            >
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {workPeriods.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Períodos de atendimento</CardTitle>
            <CardDescription>
              Corrija datas e validade. Iniciar ou encerrar o atendimento
              continua na tela operacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {workPeriods.map((period, index) => (
              <div
                key={period.id}
                className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2"
              >
                <p className="text-sm font-medium md:col-span-2">
                  {period.userName} · ciclo {period.cycle}
                </p>
                <Field>
                  <FieldLabel htmlFor={`work-start-${period.id}`}>
                    Início
                  </FieldLabel>
                  <Input
                    id={`work-start-${period.id}`}
                    type="datetime-local"
                    value={period.startedAt}
                    onChange={(event) =>
                      setWorkPeriods((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, startedAt: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`work-end-${period.id}`}>Fim</FieldLabel>
                  <Input
                    id={`work-end-${period.id}`}
                    type="datetime-local"
                    value={period.endedAt}
                    onChange={(event) =>
                      setWorkPeriods((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, endedAt: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`work-paused-${period.id}`}>
                    Pausado em
                  </FieldLabel>
                  <Input
                    id={`work-paused-${period.id}`}
                    type="datetime-local"
                    value={period.pausedAt}
                    onChange={(event) =>
                      setWorkPeriods((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, pausedAt: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`work-cycle-${period.id}`}>
                    Ciclo
                  </FieldLabel>
                  <Input
                    id={`work-cycle-${period.id}`}
                    type="number"
                    min={1}
                    value={period.cycle}
                    onChange={(event) =>
                      setWorkPeriods((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, cycle: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Válido</FieldLabel>
                  <Switch
                    checked={period.valid}
                    onCheckedChange={(value) =>
                      setWorkPeriods((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, valid: Boolean(value) }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comentários</CardTitle>
          </CardHeader>
          <CardContent className="flex max-h-80 flex-col gap-3 overflow-auto text-sm">
            {ticket.comments.length === 0 ? (
              <p className="text-muted-foreground">Nenhum comentário.</p>
            ) : (
              ticket.comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border p-3">
                  <p className="text-xs text-muted-foreground">
                    {comment.author.name} · {formatDateTime(comment.createdAt)}
                    {comment.internal ? " · interno" : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent className="flex max-h-80 flex-col gap-3 overflow-auto text-sm">
            {ticket.history.map((event) => (
              <div key={event.id} className="rounded-2xl border p-3">
                <p className="font-medium">
                  {ticketHistoryLabels[event.action] ?? event.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                  {event.details &&
                  typeof event.details === "object" &&
                  "reason" in event.details &&
                  typeof event.details.reason === "string"
                    ? ` · ${event.details.reason}`
                    : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft01Icon, PlayIcon, StopIcon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { toast } from "sonner";
import { ParticipantRole, TicketAssetRelation } from "@/lib/client-enums";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  kanbanColumns,
  normalizeRequestType,
  requestTypeLabels,
  slaState,
} from "@/lib/domain/request-types";
import {
  formatDateTime,
  formatDuration,
  ticketHistoryLabels,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

type TicketData = {
  id: string;
  number: number;
  externalReference: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  requestType: string | null;
  requesterName: string;
  assigneeId: string | null;
  costCenterId: string | null;
  catalogServiceId: string | null;
  serviceDeadline: string | null;
  resolutionSummary: string | null;
  openedAt: string;
  version: number;
  costCenter: {
    id: string;
    name: string;
    code: string;
    active: boolean;
  } | null;
  catalogService: {
    id: string;
    name: string;
    code: string;
    group: { name: string };
  } | null;
  assignee: { id: string; name: string; email: string } | null;
  comments: Array<{
    id: string;
    body: string;
    internal: boolean;
    createdAt: string;
    author: { name: string };
  }>;
  workPeriods: Array<{
    id: string;
    userId: string;
    startedAt: string;
    endedAt: string | null;
    valid: boolean;
    user: { name: string };
  }>;
  history: Array<{
    id: string;
    action: string;
    createdAt: string;
    details?: unknown;
  }>;
  evaluations: Array<{
    score: number;
    justification: string | null;
    resolutionCycle: number;
  }>;
  syncExecutions: Array<{
    id: string;
    event: string;
    direction: string;
    status: string;
    lastError: string | null;
    createdAt: string;
  }>;
  participants: Array<{
    id: string;
    role: ParticipantRole;
    user: { id: string; name: string; email: string };
  }>;
  attachments: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
    uploadedBy: { id: string; name: string };
  }>;
  assets: Array<{
    assetId: string;
    relationType: TicketAssetRelation;
    asset: { id: string; assetTag: string; name: string };
  }>;
};

export function TicketWorkspace({
  ticket,
  costCenters,
  users,
  assets,
  services,
  currentUserId,
  canManageTickets,
}: {
  ticket: TicketData;
  costCenters: Array<{ id: string; name: string; code: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  assets: Array<{ id: string; assetTag: string; name: string }>;
  services: Array<{
    id: string;
    name: string;
    code: string;
    group: { name: string };
  }>;
  currentUserId: string;
  canManageTickets: boolean;
}) {
  const evaluation = ticket.evaluations[0] ?? null;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);
  const [resolution, setResolution] = useState(ticket.resolutionSummary ?? "");
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? "");
  const [assignReason, setAssignReason] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [assetId, setAssetId] = useState("");
  const activeWork = useMemo(
    () =>
      ticket.workPeriods.find(
        (period) => period.userId === currentUserId && !period.endedAt,
      ),
    [ticket.workPeriods, currentUserId],
  );
  const sla = slaState(
    ticket.serviceDeadline,
    ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status),
  );
  const extraUsers = users.filter(
    (user) =>
      user.id !== ticket.assigneeId &&
      !ticket.participants.some((item) => item.user.id === user.id),
  );

  function mutate(action: () => Promise<unknown>, success: string) {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/gestec_help_desk/tickets" prefetch={false} />}
            aria-label="Voltar para tickets"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                #{ticket.number} — {ticket.title}
              </h1>
              <Badge variant="secondary">
                {ticketStatusLabels[ticket.status]}
              </Badge>
              <Badge variant="outline">
                {requestTypeLabels[normalizeRequestType(ticket.requestType)]}
              </Badge>
              <Badge
                variant={sla.state === "overdue" ? "destructive" : "outline"}
              >
                {sla.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {ticket.externalReference} · aberto por {ticket.requesterName} em{" "}
              {formatDateTime(ticket.openedAt)}
            </p>
          </div>
        </div>
        {activeWork ? (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              mutate(
                () =>
                  apiRequest(
                    `/api/v1/gestec-help-desk/tickets/${ticket.id}/work`,
                    {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        action: "stop",
                        requestKey: crypto.randomUUID(),
                      }),
                    },
                  ),
                "Período de atendimento encerrado.",
              )
            }
          >
            <HugeiconsIcon data-icon="inline-start" icon={StopIcon} /> Parar
            atendimento
          </Button>
        ) : (
          <Button
            disabled={
              pending ||
              ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status)
            }
            onClick={() =>
              mutate(
                () =>
                  apiRequest(
                    `/api/v1/gestec-help-desk/tickets/${ticket.id}/work`,
                    {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        action: "start",
                        requestKey: crypto.randomUUID(),
                      }),
                    },
                  ),
                "Atendimento iniciado.",
              )
            }
          >
            <HugeiconsIcon data-icon="inline-start" icon={PlayIcon} /> Iniciar
            atendimento
          </Button>
        )}
      </div>

      {!ticket.costCenter && (
        <Alert variant="destructive">
          <AlertTitle>Centro de custo pendente</AlertTitle>
          <AlertDescription>
            Defina um projeto válido antes da conclusão. Horas sem centro de
            custo não são faturáveis.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.75fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Solicitação</CardTitle>
              <CardDescription>
                Conteúdo recebido do processo do Zeev.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comunicação</CardTitle>
              <CardDescription>
                Comentários externos são sincronizáveis; notas internas ficam
                restritas à TI.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {ticket.comments.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum comentário registrado.
                </p>
              ) : (
                ticket.comments.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {item.author.name}{" "}
                        {item.internal && (
                          <Badge variant="outline">Nota interna</Badge>
                        )}
                      </span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{item.body}</p>
                  </div>
                ))
              )}
              <Separator />
              <Field>
                <FieldLabel htmlFor="comment">Novo comentário</FieldLabel>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Descreva a atualização do atendimento"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={internal}
                  onCheckedChange={(value) => setInternal(Boolean(value))}
                />{" "}
                Nota interna da equipe de TI
              </label>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                disabled={pending || !comment.trim()}
                onClick={() =>
                  mutate(async () => {
                    await apiRequest(
                      `/api/v1/gestec-help-desk/tickets/${ticket.id}/comments`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          body: comment,
                          internal,
                          requestKey: crypto.randomUUID(),
                        }),
                      },
                    );
                    setComment("");
                  }, "Comentário adicionado.")
                }
              >
                Adicionar comentário
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anexos</CardTitle>
              <CardDescription>
                Arquivos ficam no armazenamento local até a definição do
                provider corporativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ticket.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
              ) : (
                ticket.attachments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <a
                      className="font-medium hover:underline"
                      href={`/api/v1/gestec-help-desk/tickets/${ticket.id}/attachments/${item.id}`}
                    >
                      {item.originalName}
                    </a>
                    <span className="text-muted-foreground">
                      {item.uploadedBy.name} · {formatDateTime(item.createdAt)}
                    </span>
                    {(item.uploadedBy.id === currentUserId ||
                      canManageTickets) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          mutate(
                            () =>
                              apiRequest(
                                `/api/v1/gestec-help-desk/tickets/${ticket.id}/attachments/${item.id}`,
                                { method: "DELETE" },
                              ),
                            "Anexo removido.",
                          )
                        }
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))
              )}
              <Input
                type="file"
                aria-label="Enviar anexo"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const data = new FormData();
                  data.set("file", file);
                  data.set("requestKey", crypto.randomUUID());
                  mutate(
                    () =>
                      apiRequest(
                        `/api/v1/gestec-help-desk/tickets/${ticket.id}/attachments`,
                        { method: "POST", body: data },
                      ),
                    "Anexo enviado.",
                  );
                  event.target.value = "";
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Períodos de trabalho</CardTitle>
              <CardDescription>
                Somente intervalos encerrados e válidos entram no apontamento
                automático.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ticket.workPeriods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum período registrado.
                </p>
              ) : (
                ticket.workPeriods.map((period) => (
                  <div
                    key={period.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                  >
                    <span>{period.user.name}</span>
                    <span className="tabular-nums">
                      {formatDateTime(period.startedAt)} →{" "}
                      {period.endedAt
                        ? formatDateTime(period.endedAt)
                        : "em andamento"}
                    </span>
                    <Badge variant={period.endedAt ? "outline" : "secondary"}>
                      {period.endedAt
                        ? formatDuration(
                            (new Date(period.endedAt).getTime() -
                              new Date(period.startedAt).getTime()) /
                              1000,
                          )
                        : "Ativo"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>
                Timeline append-only das mudanças do ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ticket.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem eventos registrados.
                </p>
              ) : (
                ticket.history.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b py-2 text-sm last:border-0"
                  >
                    <span>
                      {ticketHistoryLabels[item.action] ?? item.action}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel>Prioridade</FieldLabel>
                <div className="text-sm">
                  {ticketPriorityLabels[ticket.priority]}
                </div>
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={normalizeRequestType(ticket.requestType)}
                  onValueChange={(value) =>
                    mutate(
                      () =>
                        apiRequest(
                          `/api/v1/gestec-help-desk/tickets/${ticket.id}`,
                          {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              requestType: value,
                              version: ticket.version,
                            }),
                          },
                        ),
                      "Tipo atualizado.",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <FieldLabel>Serviço</FieldLabel>
                <Select
                  value={ticket.catalogServiceId ?? "none"}
                  onValueChange={(value) =>
                    mutate(
                      () =>
                        apiRequest(
                          `/api/v1/gestec-help-desk/tickets/${ticket.id}`,
                          {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              catalogServiceId: value === "none" ? null : value,
                              version: ticket.version,
                            }),
                          },
                        ),
                      "Serviço atualizado.",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value) =>
                        value === "none"
                          ? "Não classificado"
                          : (services.find((item) => item.id === value)?.name ??
                            ticket.catalogService?.name ??
                            "Selecionar")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não classificado</SelectItem>
                    {services.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.group.name} · {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Projeto</FieldLabel>
                <Select
                  value={ticket.costCenterId ?? "none"}
                  onValueChange={(value) =>
                    mutate(
                      () =>
                        apiRequest(
                          `/api/v1/gestec-help-desk/tickets/${ticket.id}`,
                          {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              costCenterId: value === "none" ? null : value,
                              version: ticket.version,
                            }),
                          },
                        ),
                      "Projeto atualizado.",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value) =>
                        value === "none"
                          ? "Pendente de classificação"
                          : (costCenters.find((item) => item.id === value)
                              ?.name ?? "Selecionar centro de custo")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Pendente de classificação
                    </SelectItem>
                    {costCenters.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {item.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsáveis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {canManageTickets ? (
                <>
                  <Field>
                    <FieldLabel>Responsável principal</FieldLabel>
                    <Select
                      value={assigneeId || "none"}
                      onValueChange={(value) =>
                        setAssigneeId(value === "none" ? "" : (value ?? ""))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {(value) =>
                            users.find((user) => user.id === value)?.name ??
                            "Não atribuído"
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
                    <FieldLabel htmlFor="assign-reason">
                      Motivo da transferência
                    </FieldLabel>
                    <Input
                      id="assign-reason"
                      value={assignReason}
                      onChange={(event) => setAssignReason(event.target.value)}
                    />
                  </Field>
                  <Button
                    disabled={
                      pending ||
                      assignReason.trim().length < 3 ||
                      assigneeId === (ticket.assigneeId ?? "")
                    }
                    onClick={() =>
                      mutate(
                        () =>
                          apiRequest(
                            `/api/v1/gestec-help-desk/tickets/${ticket.id}/assign`,
                            {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                assigneeId: assigneeId || null,
                                reason: assignReason,
                                version: ticket.version,
                              }),
                            },
                          ),
                        "Responsável atualizado.",
                      )
                    }
                  >
                    Transferir
                  </Button>
                </>
              ) : ticket.assignee ? (
                <Field>
                  <FieldLabel>Responsável principal</FieldLabel>
                  <p className="text-sm">{ticket.assignee.name}</p>
                </Field>
              ) : (
                <Button
                  disabled={pending}
                  onClick={() =>
                    mutate(
                      () =>
                        apiRequest(
                          `/api/v1/gestec-help-desk/tickets/${ticket.id}/assign`,
                          {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              assigneeId: currentUserId,
                              reason: "Ticket assumido para atendimento",
                              version: ticket.version,
                            }),
                          },
                        ),
                      "Ticket atribuído a você.",
                    )
                  }
                >
                  Assumir ticket
                </Button>
              )}
              <Separator />
              {ticket.participants
                .filter((item) => item.role !== "PRIMARY")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{item.user.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutate(
                          () =>
                            apiRequest(
                              `/api/v1/gestec-help-desk/tickets/${ticket.id}/participants/${item.id}`,
                              { method: "DELETE" },
                            ),
                          "Colaborador removido.",
                        )
                      }
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              <Select
                value={participantId}
                onValueChange={(value) => setParticipantId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      extraUsers.find((user) => user.id === value)?.name ??
                      "Adicionar colaborador"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {extraUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!participantId || pending}
                onClick={() =>
                  mutate(async () => {
                    await apiRequest(
                      `/api/v1/gestec-help-desk/tickets/${ticket.id}/participants`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          userId: participantId,
                          role: ParticipantRole.ADDITIONAL,
                        }),
                      },
                    );
                    setParticipantId("");
                  }, "Colaborador adicionado.")
                }
              >
                Adicionar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ativos vinculados</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {ticket.assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ativo no contexto deste atendimento.
                </p>
              ) : (
                ticket.assets.map((item) => (
                  <div
                    key={item.assetId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>
                      {item.asset.assetTag} · {item.asset.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        mutate(
                          () =>
                            apiRequest(
                              `/api/v1/gestec-help-desk/tickets/${ticket.id}/assets/${item.assetId}`,
                              { method: "DELETE" },
                            ),
                          "Ativo desvinculado.",
                        )
                      }
                    >
                      Remover
                    </Button>
                  </div>
                ))
              )}
              <Select
                value={assetId}
                onValueChange={(value) => setAssetId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) =>
                      assets.find((item) => item.id === value)?.name ??
                      "Selecionar ativo"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assets.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.assetTag} · {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!assetId || pending}
                onClick={() =>
                  mutate(async () => {
                    await apiRequest(
                      `/api/v1/gestec-help-desk/tickets/${ticket.id}/assets`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          assetId,
                          relationType: TicketAssetRelation.CONTEXT,
                        }),
                      },
                    );
                    setAssetId("");
                  }, "Ativo vinculado.")
                }
              >
                Vincular ativo
              </Button>
            </CardContent>
          </Card>

          {ticket.syncExecutions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sincronização Zeev</CardTitle>
                <CardDescription>
                  Tentativas de entrada e saída deste ticket.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {ticket.syncExecutions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                  >
                    <span>
                      {item.direction === "INBOUND" ? "Zeev → HD" : "HD → Zeev"}{" "}
                      · {item.event}
                    </span>
                    <Badge
                      variant={
                        item.status === "FAILED" ? "destructive" : "outline"
                      }
                    >
                      {item.status === "SUCCEEDED"
                        ? "Sucesso"
                        : item.status === "FAILED"
                          ? "Falha"
                          : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {evaluation && (
            <Card>
              <CardHeader>
                <CardTitle>Avaliação do Zeev</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{evaluation.score}/10</p>
                {evaluation.justification && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {evaluation.justification}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Concluir atendimento</CardTitle>
              <CardDescription>
                Consolida as horas da TI. A avaliação do solicitante continua no
                Zeev.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor="resolution">Resumo da solução</FieldLabel>
                <Textarea
                  id="resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  placeholder="Explique o que foi corrigido"
                />
              </Field>
            </CardContent>
            <CardFooter>
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      className="w-full"
                      disabled={
                        pending ||
                        !resolution.trim() ||
                        !ticket.costCenterId ||
                        ["RESOLVED", "CLOSED"].includes(ticket.status)
                      }
                    />
                  }
                >
                  Finalizar no Help Desk
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Finalizar ticket?</DialogTitle>
                    <DialogDescription>
                      As horas válidas são consolidadas e o Zeev avança as
                      etapas da TI (contato, atendimento e aprovação interna). A
                      avaliação permanece com o solicitante no Zeev.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancelar
                    </DialogClose>
                    <DialogClose
                      render={
                        <Button
                          onClick={() =>
                            mutate(
                              () =>
                                apiRequest(
                                  `/api/v1/gestec-help-desk/tickets/${ticket.id}/resolve`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      resolutionSummary: resolution,
                                      version: ticket.version,
                                      requestKey: `zeev:${ticket.externalReference}:resolve:${ticket.version}`,
                                    }),
                                  },
                                ),
                              "Ticket finalizado e sincronização registrada.",
                            )
                          }
                        />
                      }
                    >
                      Confirmar conclusão
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

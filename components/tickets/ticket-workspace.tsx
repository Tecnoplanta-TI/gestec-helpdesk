"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import {
  Field,
  FieldDescription,
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
  resolutionCycle: number;
  requestType: string | null;
  service: string | null;
  serviceGroup: string | null;
  applicationOrProcess: string | null;
  assetCode: string | null;
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
    cycle: number;
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
    payload: unknown;
    attempts: number;
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

function isStageReady(
  payload: unknown,
  stage: string,
  resolutionCycle: number,
) {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    (payload as Record<string, unknown>).stage === stage &&
    (payload as Record<string, unknown>).resolutionCycle === resolutionCycle,
  );
}

export function TicketWorkspace({
  ticket,
  costCenters,
  users,
  assets,
  services,
  serviceGroups,
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
  serviceGroups: string[];
  currentUserId: string;
  canManageTickets: boolean;
}) {
  const evaluation = ticket.evaluations[0] ?? null;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);
  const [resolution, setResolution] = useState(ticket.resolutionSummary ?? "");
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? "");
  const [assignReason, setAssignReason] = useState("");
  const [triageReason, setTriageReason] = useState("");
  const [classificationConfirmed, setClassificationConfirmed] = useState(false);
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [assetId, setAssetId] = useState("");
  const activeWork = useMemo(
    () =>
      ticket.workPeriods.find(
        (period) => period.userId === currentUserId && !period.endedAt,
      ),
    [ticket.workPeriods, currentUserId],
  );
  const initialContactRecorded = ticket.workPeriods.some(
    (period) => period.cycle === ticket.resolutionCycle,
  );
  const triageSyncBlocked = ticket.syncExecutions.some(
    (item) =>
      item.event === "ticket.triage_approved" &&
      item.direction === "OUTBOUND" &&
      item.status !== "SUCCEEDED",
  );
  const internalApprovalReady = ticket.syncExecutions.some(
    (item) =>
      item.event === "ticket.stage_ready" &&
      item.direction === "INBOUND" &&
      item.status === "SUCCEEDED" &&
      isStageReady(item.payload, "INTERNAL_APPROVAL", ticket.resolutionCycle),
  );
  const deviationReviewReady = ticket.syncExecutions.some(
    (item) =>
      item.event === "ticket.stage_ready" &&
      item.direction === "INBOUND" &&
      item.status === "SUCCEEDED" &&
      isStageReady(item.payload, "DEVIATION_REVIEW", ticket.resolutionCycle),
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
  const isTriageStage = ["NEW", "TRIAGE"].includes(ticket.status);
  const isInterruption =
    normalizeRequestType(ticket.requestType) === "interrupcao_servico";
  const isZeevServiceGroup = ticket.serviceGroup?.trim().toLowerCase() === "zeev";

  useEffect(() => {
    const failed = ticket.syncExecutions.filter(
      (item) => item.status === "FAILED",
    );
    if (failed.length)
      console.error("Falhas de sincronização do ticket", failed);
  }, [ticket.syncExecutions]);

  function mutate(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Não foi possível concluir a ação.";
        if (/zeev|sincroniza/i.test(message)) {
          console.error("Falha de sincronização do ticket", error);
          toast.error("Não foi possível concluir a etapa agora. Tente novamente.");
        } else toast.error(message);
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
              <h1
                className="max-w-[min(100%,58rem)] truncate text-2xl font-semibold tracking-tight"
                title={`#${ticket.number} — ${ticket.title}`}
              >
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
        ) : initialContactRecorded || ticket.resolutionCycle > 1 ? (
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
                "Atendimento retomado.",
              )
            }
          >
            <HugeiconsIcon data-icon="inline-start" icon={PlayIcon} /> Retomar
            atendimento
          </Button>
        ) : (
          <Button
            disabled={
              pending ||
              triageSyncBlocked ||
              ["NEW", "TRIAGE", "RESOLVED", "CLOSED", "CANCELLED"].includes(
                ticket.status,
              )
            }
            onClick={() => setContactDialogOpen(true)}
          >
            <HugeiconsIcon data-icon="inline-start" icon={PlayIcon} /> Registrar
            contato inicial
          </Button>
        )}
      </div>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar contato inicial</DialogTitle>
            <DialogDescription>
              Esta informação será registrada no histórico do ticket e enviada
              ao Zeev ao concluir a tarefa de Contato inicial.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="initial-contact-message">
              Informações do contato inicial
            </FieldLabel>
            <Textarea
              id="initial-contact-message"
              value={contactMessage}
              onChange={(event) => setContactMessage(event.target.value)}
              placeholder="Ex.: Contato realizado com o solicitante; acesso validado e atendimento iniciado."
              disabled={pending}
            />
            <FieldDescription>
              O solicitante poderá visualizar esta mensagem no processo do Zeev.
            </FieldDescription>
          </Field>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              Cancelar
            </DialogClose>
            <Button
              disabled={pending || contactMessage.trim().length < 3}
              onClick={() =>
                mutate(async () => {
                  await apiRequest(
                    `/api/v1/gestec-help-desk/tickets/${ticket.id}/initial-contact/start`,
                    {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        message: contactMessage,
                        requestKey: crypto.randomUUID(),
                      }),
                    },
                  );
                  setContactMessage("");
                  setContactDialogOpen(false);
                }, "Contato inicial registrado.")
              }
            >
              Registrar e iniciar atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!ticket.costCenter && (
        <Alert variant="destructive">
          <AlertTitle>Centro de custo pendente</AlertTitle>
          <AlertDescription>
            Defina um centro de custo válido antes da conclusão. Horas sem
            centro de custo não são faturáveis.
          </AlertDescription>
        </Alert>
      )}

      {canManageTickets && ["NEW", "TRIAGE"].includes(ticket.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Aprovar triagem</CardTitle>
            <CardDescription>
              Confirme a classificação e o responsável antes de iniciar o atendimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Field>
              <FieldLabel>Responsável pelo atendimento</FieldLabel>
              <Select
                value={assigneeId || "none"}
                onValueChange={(value) =>
                  setAssigneeId(value === "none" ? "" : (value ?? ""))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      users.find((user) => user.id === value)?.name ??
                      "Selecionar responsável"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Selecionar responsável</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="triage-reason">
                Observação da triagem{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea
                id="triage-reason"
                value={triageReason}
                onChange={(event) => setTriageReason(event.target.value)}
                placeholder="Registre uma orientação para o atendimento"
              />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">
                Conferências obrigatórias
              </FieldLegend>
              <Field orientation="horizontal">
                <Checkbox
                  id="classification-confirmed"
                  checked={classificationConfirmed}
                  onCheckedChange={(checked) =>
                    setClassificationConfirmed(Boolean(checked))
                  }
                />
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="classification-confirmed">
                    Classificação conferida
                  </FieldLabel>
                  <FieldDescription>
                    O tipo, a prioridade e o centro de custo foram revisados.
                  </FieldDescription>
                </div>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="assignment-confirmed"
                  checked={assignmentConfirmed}
                  onCheckedChange={(checked) =>
                    setAssignmentConfirmed(Boolean(checked))
                  }
                />
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="assignment-confirmed">
                    Responsável confirmado
                  </FieldLabel>
                  <FieldDescription>
                    O profissional selecionado será responsável pelo
                    atendimento.
                  </FieldDescription>
                </div>
              </Field>
            </FieldSet>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              disabled={
                pending ||
                !assigneeId ||
                !classificationConfirmed ||
                !assignmentConfirmed
              }
              onClick={() =>
                mutate(
                  () =>
                    apiRequest(
                      `/api/v1/gestec-help-desk/tickets/${ticket.id}/triage/approve`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          assigneeId,
                          reason: triageReason || undefined,
                          checklist: {
                            classificationConfirmed: true,
                            assignmentConfirmed: true,
                          },
                          version: ticket.version,
                          requestKey: crypto.randomUUID(),
                        }),
                      },
                    ),
                  "Triagem aprovada. O atendimento já pode ser iniciado.",
                )
              }
            >
              Aprovar triagem
            </Button>
          </CardFooter>
        </Card>
      )}

      {ticket.status === "WAITING_APPROVAL" && (
        <Card>
          <CardHeader>
            <CardTitle>Aprovação da conclusão</CardTitle>
            <CardDescription>
              {internalApprovalReady
                ? "A tarefa Aprovar conclusão está pronta no Zeev. Confirme-a aqui para encaminhar o ticket à validação do solicitante."
                : "A conclusão foi enviada ao Zeev. Aguarde o processo chegar à tarefa Aprovar conclusão."}
            </CardDescription>
          </CardHeader>
          {internalApprovalReady && (
            <CardFooter className="justify-end">
              <Button
                disabled={pending}
                onClick={() =>
                  mutate(
                    () =>
                      apiRequest(
                        `/api/v1/gestec-help-desk/tickets/${ticket.id}/approval/confirm`,
                        {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            version: ticket.version,
                            requestKey: crypto.randomUUID(),
                          }),
                        },
                      ),
                    "Conclusão aprovada e sincronizada com o Zeev.",
                  )
                }
              >
                Aprovar conclusão
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {ticket.status === "REOPENED_LOW_SCORE" && (
        <Card>
          <CardHeader>
            <CardTitle>Revisar desvio</CardTitle>
            <CardDescription>
              {deviationReviewReady
                ? "A tarefa Verificar desvio está pronta no Zeev. Decida aqui se o solicitante fará uma nova avaliação ou se o ticket será concluído."
                : "A avaliação baixa foi recebida. Aguarde o processo chegar à tarefa Verificar desvio no Zeev."}
            </CardDescription>
          </CardHeader>
          {deviationReviewReady && (
            <CardFooter className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  mutate(
                    () =>
                      apiRequest(
                        `/api/v1/gestec-help-desk/tickets/${ticket.id}/deviation/review`,
                        {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            action: "CLOSE_TICKET",
                            version: ticket.version,
                            requestKey: crypto.randomUUID(),
                          }),
                        },
                      ),
                    "Ticket concluído e decisão sincronizada com o Zeev.",
                  )
                }
              >
                Concluir ticket
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  mutate(
                    () =>
                      apiRequest(
                        `/api/v1/gestec-help-desk/tickets/${ticket.id}/deviation/review`,
                        {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            action: "REQUEST_REEVALUATION",
                            version: ticket.version,
                            requestKey: crypto.randomUUID(),
                          }),
                        },
                      ),
                    "Nova avaliação solicitada e sincronização registrada.",
                  )
                }
              >
                Solicitar nova avaliação
              </Button>
            </CardFooter>
          )}
        </Card>
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
          {isTriageStage && (
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
                <FieldLabel>Grupo de serviços</FieldLabel>
                <Select
                  value={ticket.serviceGroup?.trim() || "none"}
                  onValueChange={(value) =>
                    mutate(
                      () =>
                        apiRequest(
                          `/api/v1/gestec-help-desk/tickets/${ticket.id}`,
                          {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              serviceGroup: value === "none" ? null : value,
                              version: ticket.version,
                            }),
                          },
                        ),
                      "Grupo de serviços atualizado.",
                    )
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não classificado</SelectItem>
                    {serviceGroups.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Centro de custo</FieldLabel>
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
                      "Centro de custo atualizado.",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value) =>
                        value === "none"
                          ? "Centro de custo pendente"
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
              {isZeevServiceGroup && (
                <Field>
                  <FieldLabel htmlFor="triage-application">Aplicativo ou processo</FieldLabel>
                  <Input
                    id="triage-application"
                    defaultValue={ticket.applicationOrProcess ?? ""}
                    onBlur={(event) => {
                      if (event.currentTarget.value === (ticket.applicationOrProcess ?? "")) return;
                      mutate(
                        () => apiRequest(`/api/v1/gestec-help-desk/tickets/${ticket.id}`, {
                          method: "PATCH", headers: { "content-type": "application/json" },
                          body: JSON.stringify({ applicationOrProcess: event.currentTarget.value || null, version: ticket.version }),
                        }),
                        "Aplicativo atualizado.",
                      );
                    }}
                  />
                </Field>
              )}
              {isInterruption && (
                <Field>
                  <FieldLabel htmlFor="triage-asset-code">Código do equipamento ou infraestrutura</FieldLabel>
                  <Input
                    id="triage-asset-code"
                    defaultValue={ticket.assetCode ?? ""}
                    onBlur={(event) => {
                      if (event.currentTarget.value === (ticket.assetCode ?? "")) return;
                      mutate(
                        () => apiRequest(`/api/v1/gestec-help-desk/tickets/${ticket.id}`, {
                          method: "PATCH", headers: { "content-type": "application/json" },
                          body: JSON.stringify({ assetCode: event.currentTarget.value || null, version: ticket.version }),
                        }),
                        "Informação de infraestrutura atualizada.",
                      );
                    }}
                  />
                </Field>
              )}
            </CardContent>
          </Card>
          )}

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

          {ticket.status === "IN_PROGRESS" && (
            <Card>
              <CardHeader>
                <CardTitle>Concluir atendimento</CardTitle>
                <CardDescription>
                  Consolida as horas da TI e encaminha o ticket para aprovação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="resolution">
                    Resumo da solução
                  </FieldLabel>
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
                        etapas da TI (contato, atendimento e aprovação interna).
                        A avaliação permanece com o solicitante no Zeev.
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
          )}
        </div>
      </div>
    </div>
  );
}

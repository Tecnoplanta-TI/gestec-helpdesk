import { request as httpsRequest } from "node:https";

import { Prisma, SyncDirection, SyncStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeRequestType } from "@/lib/domain/request-types";

type SyncRow = {
  id: string;
  event: string;
  payload: Prisma.JsonValue;
  ticketId: string | null;
};

type ZeevRequest = {
  method: "POST" | "PUT";
  path: string;
  body: Record<string, unknown>;
  optional?: boolean;
};

type ZeevFormField = {
  name: string;
  value?: string | number | boolean | null;
  row: number;
};

// Estes aliases foram confirmados pelo retorno da API do processo Abertura de
// Ticket T.I. O Zeev exige seus valores novamente quando a Triagem é concluída.
const requiredTriageFormFields = ["servico", "nivel", "responsavel"] as const;
const requiredAvailabilityFormFields = [
  "sistemaIndisponivel",
  "infraestruturaInoperante",
] as const;

export function missingRequiredTriageFormFields(formFields: ZeevFormField[]) {
  const requestType = normalizeRequestType(
    String(
      formFields.find((field) => field.name === "tipoSolicitacao")?.value ?? "",
    ),
  );
  const requiredFields =
    requestType === "incidente" || requestType === "interrupcao_servico"
      ? [...requiredTriageFormFields, ...requiredAvailabilityFormFields]
      : requiredTriageFormFields;
  const values = new Map(
    formFields.map((field) => [
      field.name,
      typeof field.value === "string" ? field.value.trim() : field.value,
    ]),
  );
  return requiredFields.filter((name) => {
    const value = values.get(name);
    return value === undefined || value === null || value === "";
  });
}

export function isRealZeevApiEnabled() {
  return Boolean(
    process.env.ZEEV_API_BASE_URL?.trim() && process.env.ZEEV_API_TOKEN?.trim(),
  );
}

function zeevBaseUrl() {
  return (process.env.ZEEV_API_BASE_URL ?? "").replace(/\/$/, "");
}

function instanceIdFrom(value: unknown) {
  const text = String(value ?? "").trim();
  const numeric = Number.parseInt(text, 10);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function payloadRecord(payload: Prisma.JsonValue) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function envCode(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function zeevProcessTasks() {
  return {
    triage: envCode("ZEEV_TASK_TRIAGE_CODE"),
    contact: envCode("ZEEV_TASK_CONTACT_CODE"),
    service: envCode("ZEEV_TASK_SERVICE_CODE", "ZEEV_WAIT_TASK_CODE"),
    approve: envCode("ZEEV_TASK_APPROVE_CODE"),
    deviation: envCode("ZEEV_TASK_DEVIATION_CODE"),
    triageResult: envCode("ZEEV_TRIAGE_RESULT"),
    contactResult: envCode("ZEEV_CONTACT_RESULT") || "Concluir",
    serviceResult:
      envCode("ZEEV_SERVICE_RESULT", "ZEEV_RESOLVE_RESULT") || "Concluir",
    approveResult: envCode("ZEEV_APPROVE_RESULT") || "Aprovar",
    deviationRetryResult: envCode("ZEEV_DEVIATION_RETRY_RESULT"),
    deviationCloseResult: envCode("ZEEV_DEVIATION_CLOSE_RESULT"),
  };
}

function finishAssignment(input: {
  instanceId: number | null;
  assignmentId: number | null;
  taskCode: string;
  result: string;
  reason?: string;
  messages?: Array<{ messageBody: string; requesterCanSee: boolean }>;
  formFields?: ZeevFormField[];
  optional?: boolean;
}): ZeevRequest {
  const body: Record<string, unknown> = { result: input.result };
  if (input.reason) body.reason = input.reason;
  if (input.messages?.length) body.messages = input.messages;
  if (input.formFields?.length) body.formFields = input.formFields;
  if (input.assignmentId) {
    return {
      method: "PUT",
      path: `/api/2/assignments/${input.assignmentId}`,
      body,
      optional: input.optional,
    };
  }
  if (!input.instanceId || !input.taskCode) {
    throw new Error(
      "Informe o apelido da tarefa Zeev da TI e o instanceId da solicitação.",
    );
  }
  return {
    method: "PUT",
    path: `/api/2/assignments/instance/${input.instanceId}/${encodeURIComponent(input.taskCode)}`,
    body,
    optional: input.optional,
  };
}

export function buildZeevOutboundRequests(input: {
  event: string;
  payload: Prisma.JsonValue;
  ticket: {
    externalInstanceId: string | null;
    zeevTaskCode: string | null;
    zeevAssignmentId: string | null;
    resolutionSummary: string | null;
  } | null;
  formFields?: ZeevFormField[];
}): ZeevRequest[] {
  const payload = payloadRecord(input.payload);
  const tasks = zeevProcessTasks();
  const instanceId =
    instanceIdFrom(payload.instanceId) ??
    instanceIdFrom(input.ticket?.externalInstanceId);
  const assignmentId =
    instanceIdFrom(payload.assignmentId) ??
    instanceIdFrom(input.ticket?.zeevAssignmentId);
  const explicitTask = String(payload.taskCode ?? "").trim();

  if (input.event === "ticket.comment_added") {
    const author = String(payload.author ?? "Help Desk");
    const body = String(payload.body ?? "");
    if (!instanceId)
      throw new Error("Instância Zeev ausente para enviar o comentário.");
    return [
      {
        method: "POST",
        path: "/api/2/messages",
        body: {
          instanceId,
          messageBody: `${author}: ${body}`,
          requesterCanSee: true,
        },
      },
    ];
  }

  if (input.event === "ticket.contact_started") {
    const taskCode =
      explicitTask ||
      tasks.contact ||
      String(input.ticket?.zeevTaskCode ?? "").trim();
    const contactMessage =
      String(payload.contactMessage ?? "").trim() ||
      "Contato inicial iniciado pelo Help Desk.";
    return [
      finishAssignment({
        instanceId,
        assignmentId,
        taskCode,
        result: tasks.contactResult,
        reason: contactMessage,
        messages: [
          {
            messageBody: `Contato inicial registrado pelo Help Desk:\n${contactMessage}`,
            requesterCanSee: true,
          },
        ],
        formFields: input.formFields,
      }),
    ];
  }

  if (input.event === "ticket.triage_approved") {
    const taskCode = explicitTask || tasks.triage;
    if (!tasks.triageResult) {
      throw new Error(
        "Configure ZEEV_TRIAGE_RESULT com o resultado que encaminha a Triagem para Atender ticket.",
      );
    }
    return [
      finishAssignment({
        instanceId,
        assignmentId: null,
        taskCode,
        result: tasks.triageResult,
        reason: String(payload.reason ?? ""),
        formFields: input.formFields,
      }),
    ];
  }

  if (input.event === "ticket.internal_approved") {
    const taskCode = explicitTask || tasks.approve;
    return [
      finishAssignment({
        instanceId,
        assignmentId: null,
        taskCode,
        result: tasks.approveResult,
        reason: String(
          payload.resolutionSummary ?? input.ticket?.resolutionSummary ?? "",
        ),
        formFields: input.formFields,
      }),
    ];
  }

  if (input.event === "ticket.deviation_reviewed") {
    const action = String(payload.action ?? "").trim();
    const result =
      action === "REQUEST_REEVALUATION"
        ? tasks.deviationRetryResult
        : action === "CLOSE_TICKET"
          ? tasks.deviationCloseResult
          : "";
    if (!result) {
      throw new Error(
        "Configure o resultado Zeev correspondente à revisão de desvio antes de sincronizá-la.",
      );
    }
    return [
      finishAssignment({
        instanceId,
        assignmentId: null,
        taskCode: explicitTask || tasks.deviation,
        result,
        formFields: input.formFields,
      }),
    ];
  }

  if (input.event === "ticket.resolved") {
    const comments = Array.isArray(payload.comments) ? payload.comments : [];
    const messages = [
      {
        messageBody: String(
          payload.resolutionSummary ??
            input.ticket?.resolutionSummary ??
            "Atendimento concluído no Help Desk.",
        ),
        requesterCanSee: true,
      },
      ...comments.map((comment) => {
        const row =
          comment && typeof comment === "object"
            ? (comment as Record<string, unknown>)
            : {};
        return {
          messageBody: `${String(row.author ?? "Help Desk")}: ${String(row.body ?? "")}`,
          requesterCanSee: true,
        };
      }),
    ];
    const taskCode =
      explicitTask ||
      tasks.service ||
      String(input.ticket?.zeevTaskCode ?? "").trim();
    return [
      finishAssignment({
        instanceId,
        assignmentId,
        taskCode,
        result: tasks.serviceResult,
        reason: String(payload.resolutionSummary ?? ""),
        messages,
        formFields: input.formFields,
      }),
    ];
  }

  throw new Error(`Evento ${input.event} não possui callback na API do Zeev.`);
}

export function buildZeevOutboundRequest(
  input: Parameters<typeof buildZeevOutboundRequests>[0],
) {
  return buildZeevOutboundRequests(input)[0];
}

async function callZeev(request: ZeevRequest) {
  const requestBody = JSON.stringify(request.body);
  const response = await new Promise<{ status: number; body: string }>(
    (resolve, reject) => {
      const client = httpsRequest(
        new URL(`${zeevBaseUrl()}${request.path}`),
        {
          method: request.method,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "content-length": Buffer.byteLength(requestBody),
            authorization: `Bearer ${process.env.ZEEV_API_TOKEN ?? ""}`,
            "user-agent": "Gestec-HelpDesk/1.0",
          },
          timeout: 15_000,
        },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
          incoming.on("end", () => {
            resolve({
              status: incoming.statusCode ?? 500,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          });
        },
      );
      client.once("timeout", () => {
        client.destroy(new Error("A API do Zeev excedeu o tempo de resposta."));
      });
      client.once("error", reject);
      client.end(requestBody);
    },
  );
  const responseText = response.body;
  let responseBody: unknown = { status: response.status };
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText) as unknown;
    } catch {
      responseBody = { status: response.status, detail: responseText };
    }
  }
  const apiError =
    responseBody && typeof responseBody === "object" && "error" in responseBody
      ? responseBody.error
      : null;
  if (
    request.optional &&
    (response.status === 404 || response.status === 409)
  ) {
    return { skipped: true, status: response.status, response: responseBody };
  }
  if (response.status < 200 || response.status >= 300 || apiError) {
    const values = [
      typeof apiError === "object" && apiError && "message" in apiError
        ? apiError.message
        : null,
      typeof responseBody === "object" &&
      responseBody &&
      "message" in responseBody
        ? responseBody.message
        : null,
      typeof responseBody === "object" &&
      responseBody &&
      "detail" in responseBody
        ? responseBody.detail
        : null,
    ];
    const details =
      typeof apiError === "object" && apiError && "details" in apiError
        ? apiError.details
        : null;
    const detailMessages = Array.isArray(details)
      ? details
          .map((item) =>
            item && typeof item === "object" && "message" in item
              ? String(item.message ?? "")
              : "",
          )
          .map((message) => message.replace(/\s+/g, " ").trim())
          .filter(Boolean)
      : [];
    const detail =
      (values
        .map((value) =>
          String(value ?? "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .find((value) => value && value !== "null" && value !== "undefined")
        ?.slice(0, 1_000) ??
        detailMessages.join(" ").slice(0, 1_000)) ||
      `HTTP ${response.status}`;
    throw new Error(`Zeev recusou o callback: ${detail}`);
  }
  return responseBody;
}

export async function dispatchZeevApi(execution: SyncRow) {
  const [ticket, inboundExecution] = execution.ticketId
    ? await Promise.all([
        prisma.ticket.findUnique({
          where: { id: execution.ticketId },
          select: {
            externalInstanceId: true,
            zeevTaskCode: true,
            zeevAssignmentId: true,
            resolutionSummary: true,
          },
        }),
        prisma.syncExecution.findFirst({
          where: {
            ticketId: execution.ticketId,
            direction: SyncDirection.INBOUND,
            event: "ticket.ready_for_service",
            status: SyncStatus.SUCCEEDED,
          },
          select: { payload: true },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [null, null];

  const inboundPayload = inboundExecution
    ? payloadRecord(inboundExecution.payload)
    : {};
  const rawFormFields = inboundPayload.formFields;
  const formFields = Array.isArray(rawFormFields)
    ? rawFormFields
        .flatMap((field): ZeevFormField[] => {
          if (!field || typeof field !== "object" || Array.isArray(field)) {
            return [];
          }
          const row = field as Record<string, unknown>;
          const name = String(row.name ?? "").trim();
          const value = row.value;
          if (
            !name ||
            !(
              value === undefined ||
              value === null ||
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            )
          ) {
            return [];
          }
          const fieldRow = Number(row.row ?? 1);
          return [
            {
              name,
              ...(value === undefined ? {} : { value }),
              row: Number.isInteger(fieldRow) && fieldRow > 0 ? fieldRow : 1,
            },
          ];
        })
        .slice(0, 300)
    : [];

  if (
    execution.event !== "ticket.comment_added" &&
    execution.event !== "ticket.stage_ready" &&
    execution.event !== "ticket.evaluated" &&
    !formFields.length
  ) {
    throw new Error(
      "O ticket não recebeu os formFields do Zeev. Inclua a lista de campos no corpo da integração de entrada e envie uma nova solicitação de teste antes de concluir a tarefa pelo Help Desk.",
    );
  }

  if (execution.event === "ticket.triage_approved") {
    const missing = missingRequiredTriageFormFields(formFields);
    if (missing.length) {
      throw new Error(
        `A solicitação Zeev chegou sem valor nos campos obrigatórios: ${missing.join(", ")}. Preencha-os no formulário de abertura e envie uma nova solicitação de teste antes de aprovar a Triagem.`,
      );
    }
  }

  const requests = buildZeevOutboundRequests({
    event: execution.event,
    payload: execution.payload,
    ticket,
    formFields,
  });
  const responses = [];
  for (const request of requests) {
    responses.push(await callZeev(request));
  }

  return prisma.syncExecution.update({
    where: { id: execution.id },
    data: {
      status: SyncStatus.SUCCEEDED,
      attempts: { increment: 1 },
      processingStartedAt: null,
      response: responses as Prisma.InputJsonValue,
      lastError: null,
    },
  });
}

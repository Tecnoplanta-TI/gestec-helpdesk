import { Prisma, SyncStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
    contact: envCode("ZEEV_TASK_CONTACT_CODE"),
    service: envCode("ZEEV_TASK_SERVICE_CODE", "ZEEV_WAIT_TASK_CODE"),
    approve: envCode("ZEEV_TASK_APPROVE_CODE"),
    contactResult: envCode("ZEEV_CONTACT_RESULT") || "Concluir",
    serviceResult:
      envCode("ZEEV_SERVICE_RESULT", "ZEEV_RESOLVE_RESULT") || "Concluir",
    approveResult: envCode("ZEEV_APPROVE_RESULT") || "Aprovar",
  };
}

function finishAssignment(input: {
  instanceId: number | null;
  assignmentId: number | null;
  taskCode: string;
  result: string;
  reason?: string;
  messages?: Array<{ messageBody: string; requesterCanSee: boolean }>;
  optional?: boolean;
}): ZeevRequest {
  const body: Record<string, unknown> = { result: input.result };
  if (input.reason) body.reason = input.reason;
  if (input.messages?.length) body.messages = input.messages;
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
    return [
      finishAssignment({
        instanceId,
        assignmentId,
        taskCode,
        result: tasks.contactResult,
        optional: true,
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
        optional: true,
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
  const response = await fetch(`${zeevBaseUrl()}${request.path}`, {
    method: request.method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${process.env.ZEEV_API_TOKEN ?? ""}`,
    },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(15_000),
  });
  const responseBody = await response
    .json()
    .catch(() => ({ status: response.status }));
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
  if (!response.ok || apiError) {
    const detail =
      typeof apiError === "object" && apiError && "message" in apiError
        ? String(apiError.message)
        : `HTTP ${response.status}`;
    throw new Error(`Zeev recusou o callback: ${detail}`);
  }
  return responseBody;
}

export async function dispatchZeevApi(execution: SyncRow) {
  const ticket = execution.ticketId
    ? await prisma.ticket.findUnique({
        where: { id: execution.ticketId },
        select: {
          externalInstanceId: true,
          zeevTaskCode: true,
          zeevAssignmentId: true,
          resolutionSummary: true,
        },
      })
    : null;

  const requests = buildZeevOutboundRequests({
    event: execution.event,
    payload: execution.payload,
    ticket,
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
      response: responses as Prisma.InputJsonValue,
      lastError: null,
    },
  });
}

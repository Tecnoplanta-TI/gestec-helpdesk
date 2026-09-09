import { timingSafeEqual } from "node:crypto";
import {
  Prisma,
  SyncDirection,
  SyncStatus,
  TicketStatus,
} from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";
import {
  normalizePriority,
  type evaluationSchema,
  type zeevTicketSchema,
} from "@/lib/domain/schemas";
import {
  normalizeRequestType,
  parseOptionalDate,
} from "@/lib/domain/request-types";
import type { z } from "zod";

type ZeevTicketInput = z.infer<typeof zeevTicketSchema>;
type EvaluationInput = z.infer<typeof evaluationSchema>;

export function assertBearerToken(
  request: Request,
  expected: string | undefined,
) {
  const authorization = request.headers.get("authorization");
  const received = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected ?? "");
  if (
    !expected ||
    receivedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(receivedBytes, expectedBytes)
  ) {
    throw new ApiError(401, "INVALID_TOKEN", "Token de integração inválido.");
  }
}

export async function receiveZeevTicket(input: ZeevTicketInput) {
  return prisma.$transaction(async (tx) => {
    const previousExecution = await tx.syncExecution.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (previousExecution) {
      const existing = previousExecution.ticketId
        ? await tx.ticket.findUnique({
            where: { id: previousExecution.ticketId },
            include: { costCenter: true, assignee: true },
          })
        : null;
      if (!existing)
        throw new ApiError(
          409,
          "INCONSISTENT_REPLAY",
          "Evento repetido sem ticket correspondente.",
        );
      if (existing.externalReference !== input.ticket.externalReference) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "A chave de idempotência já foi usada por outro ticket.",
        );
      }
      return { ticket: existing, replay: true };
    }

    const costCenterValue = input.ticket.costCenter?.sourceValue?.trim();
    const costCenter = costCenterValue
      ? await tx.costCenter.findFirst({
          where: {
            OR: [
              { code: { equals: costCenterValue, mode: "insensitive" } },
              { name: { equals: costCenterValue, mode: "insensitive" } },
            ],
          },
        })
      : null;

    const ticket = await tx.ticket.upsert({
      where: { externalReference: input.ticket.externalReference },
      create: {
        externalReference: input.ticket.externalReference,
        externalInstanceId: String(input.source.instanceId),
        externalInstanceUrl: input.source.instanceUrl || null,
        zeevTaskCode:
          input.source.taskCode || process.env.ZEEV_WAIT_TASK_CODE || null,
        zeevAssignmentId: input.source.assignmentId || null,
        title: input.ticket.summary,
        description: input.ticket.supportNotes || input.ticket.summary,
        requestType: normalizeRequestType(input.ticket.requestType),
        service: input.ticket.service || null,
        serviceGroup: input.ticket.serviceGroup || null,
        applicationOrProcess: input.ticket.applicationOrProcess || null,
        assetCode: input.ticket.assetCode || null,
        priority: normalizePriority(input.ticket.priority),
        requesterName: input.requester.name,
        requesterExternalId: input.requester.name,
        openedAt: input.requester.openedAt,
        costCenterId: costCenter?.id,
        firstContactDeadline: parseOptionalDate(
          input.assignment?.initialContactDeadline,
        ),
        serviceDeadline: parseOptionalDate(input.assignment?.serviceDeadline),
      },
      update: {
        externalInstanceId: String(input.source.instanceId),
        externalInstanceUrl: input.source.instanceUrl || null,
        zeevTaskCode:
          input.source.taskCode || process.env.ZEEV_WAIT_TASK_CODE || null,
        zeevAssignmentId: input.source.assignmentId || null,
        title: input.ticket.summary,
        description: input.ticket.supportNotes || input.ticket.summary,
        requestType: normalizeRequestType(input.ticket.requestType),
        service: input.ticket.service || null,
        serviceGroup: input.ticket.serviceGroup || null,
        applicationOrProcess: input.ticket.applicationOrProcess || null,
        assetCode: input.ticket.assetCode || null,
        priority: normalizePriority(input.ticket.priority),
        requesterName: input.requester.name,
        costCenterId: costCenter?.id,
        firstContactDeadline: parseOptionalDate(
          input.assignment?.initialContactDeadline,
        ),
        serviceDeadline: parseOptionalDate(input.assignment?.serviceDeadline),
        version: { increment: 1 },
      },
      include: { costCenter: true, assignee: true },
    });

    await tx.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: "RECEIVED_FROM_ZEEV",
        toStatus: ticket.status,
        details: {
          processName: input.source.processName,
          instanceId: input.source.instanceId,
          costCenterSourceValue: costCenterValue ?? null,
          costCenterMatched: Boolean(costCenter),
        },
      },
    });
    await tx.syncExecution.create({
      data: {
        ticketId: ticket.id,
        idempotencyKey: input.idempotencyKey,
        event: input.event,
        direction: SyncDirection.INBOUND,
        status: SyncStatus.SUCCEEDED,
        payload: input as unknown as Prisma.InputJsonValue,
        response: { ticketId: ticket.id, number: ticket.number },
        attempts: 1,
      },
    });
    return { ticket, replay: false };
  });
}

export async function receiveZeevEvaluation(input: EvaluationInput) {
  return prisma.$transaction(async (tx) => {
    const idempotencyKey = `zeev:eval:${input.externalId}`;
    const previousSync = await tx.syncExecution.findUnique({
      where: { idempotencyKey },
    });
    if (previousSync?.ticketId) {
      const [ticket, evaluation] = await Promise.all([
        tx.ticket.findUnique({ where: { id: previousSync.ticketId } }),
        tx.ticketEvaluation.findUnique({
          where: { externalId: input.externalId },
        }),
      ]);
      if (!ticket || !evaluation) {
        throw new ApiError(
          409,
          "INCONSISTENT_REPLAY",
          "Avaliação repetida sem resultado correspondente.",
        );
      }
      if (ticket.externalReference !== input.externalReference) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "O identificador da avaliação já foi usado em outro ticket.",
        );
      }
      return {
        ticket,
        evaluation,
        routedToAssigneeId:
          ticket.status === TicketStatus.REOPENED_LOW_SCORE
            ? ticket.assigneeId
            : null,
        replay: true,
      };
    }

    const ticket = await tx.ticket.findUnique({
      where: { externalReference: input.externalReference },
    });
    if (!ticket)
      throw new ApiError(
        404,
        "TICKET_NOT_FOUND",
        "Ticket correspondente não encontrado.",
      );
    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new ApiError(
        409,
        "TICKET_NOT_AWAITING_EVALUATION",
        "O ticket não está aguardando avaliação do solicitante.",
      );
    }
    if (input.score <= 6 && !input.justification?.trim()) {
      throw new ApiError(
        422,
        "JUSTIFICATION_REQUIRED",
        "Notas até 6 exigem justificativa.",
      );
    }

    const evaluation = await tx.ticketEvaluation.create({
      data: {
        ticketId: ticket.id,
        resolutionCycle: ticket.resolutionCycle,
        externalId: input.externalId,
        score: input.score,
        justification: input.justification,
        expectationMet: input.expectationMet,
        comments: input.comments,
      },
    });

    await tx.syncExecution.create({
      data: {
        ticketId: ticket.id,
        idempotencyKey,
        event: "ticket.evaluated",
        direction: SyncDirection.INBOUND,
        status: SyncStatus.SUCCEEDED,
        payload: input as unknown as Prisma.InputJsonValue,
        response: { score: input.score },
        attempts: 1,
      },
    });

    const lowScore = input.score <= 6;
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: lowScore
        ? {
            status: TicketStatus.REOPENED_LOW_SCORE,
            resolutionCycle: { increment: 1 },
            closedAt: null,
            version: { increment: 1 },
          }
        : {
            status: TicketStatus.CLOSED,
            closedAt: new Date(),
            version: { increment: 1 },
          },
    });
    await tx.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: lowScore ? "LOW_SCORE_REOPENED" : "EVALUATION_ACCEPTED",
        fromStatus: ticket.status,
        toStatus: updated.status,
        details: { score: input.score, externalEvaluationId: input.externalId },
      },
    });
    return {
      ticket: updated,
      evaluation,
      routedToAssigneeId: lowScore ? ticket.assigneeId : null,
      replay: false,
    };
  });
}

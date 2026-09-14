import {
  Prisma,
  SyncDirection,
  SyncStatus,
  TicketStatus,
  type TicketWorkPeriod,
  TimeEntrySource,
  TimeEntryStatus,
} from "@prisma/client";
import {
  dispatchZeevApi,
  isRealZeevApiEnabled,
  zeevProcessTasks,
} from "@/lib/domain/zeev-client";
import { ApiError } from "@/lib/http/api-error";
import { addTicketHistory } from "@/lib/domain/ticket-history";
import { prisma } from "@/lib/prisma";

export { addTicketHistory };

function stageFromPayload(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const stage = (payload as Record<string, unknown>).stage;
  return typeof stage === "string" ? stage : null;
}

function stageIsReady(
  payload: Prisma.JsonValue,
  expectedStage: "INTERNAL_APPROVAL" | "DEVIATION_REVIEW",
  resolutionCycle: number,
) {
  if (stageFromPayload(payload) !== expectedStage) return false;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  return (
    (payload as Record<string, unknown>).resolutionCycle === resolutionCycle
  );
}

export const ticketInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  costCenter: { select: { id: true, code: true, name: true, active: true } },
  catalogService: {
    select: {
      id: true,
      name: true,
      code: true,
      group: { select: { name: true } },
    },
  },
  comments: {
    select: {
      id: true,
      body: true,
      internal: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" as const },
    take: 200,
  },
  history: { orderBy: { createdAt: "desc" as const }, take: 40 },
  workPeriods: {
    select: {
      id: true,
      userId: true,
      cycle: true,
      startedAt: true,
      endedAt: true,
      pausedAt: true,
      valid: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: "desc" as const },
  },
  evaluations: {
    orderBy: [
      { resolutionCycle: "desc" as const },
      { createdAt: "desc" as const },
    ],
    take: 1,
  },
  participants: {
    where: { removedAt: null },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  attachments: {
    where: { deletedAt: null },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  assets: {
    where: { removedAt: null },
    include: {
      asset: {
        select: { id: true, assetTag: true, name: true },
      },
    },
  },
  syncExecutions: {
    select: {
      id: true,
      event: true,
      direction: true,
      status: true,
      payload: true,
      attempts: true,
      lastError: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 12,
  },
} satisfies Prisma.TicketInclude;

export async function startTicketWork(
  ticketId: string,
  userId: string,
  requestKey: string,
  contactMessage?: string,
) {
  let result: {
    period: TicketWorkPeriod;
    queuedContactKey: string | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const normalizedContactMessage = contactMessage?.trim() || null;
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket)
        throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
      const replay = await tx.ticketWorkPeriod.findUnique({
        where: { startRequestKey: requestKey },
      });
      if (replay) {
        if (replay.ticketId !== ticketId || replay.userId !== userId) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Esta chave já iniciou outro período de trabalho.",
          );
        }
        if (normalizedContactMessage) {
          const contactRecord = await tx.ticketComment.findUnique({
            where: { requestKey: `contact:${requestKey}` },
          });
          if (
            !contactRecord ||
            contactRecord.ticketId !== ticketId ||
            contactRecord.authorId !== userId ||
            contactRecord.body !== normalizedContactMessage
          ) {
            throw new ApiError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Esta chave já iniciou outro contato inicial.",
            );
          }
        }
        const contactKey =
          replay.cycle === 1 && zeevProcessTasks().contact
            ? `zeev:${ticket.externalReference}:contact:${replay.cycle}`
            : null;
        return { period: replay, queuedContactKey: contactKey };
      }
      if (
        ticket.status === TicketStatus.RESOLVED ||
        ticket.status === TicketStatus.CLOSED ||
        ticket.status === TicketStatus.CANCELLED
      ) {
        throw new ApiError(
          409,
          "TICKET_NOT_WORKABLE",
          "Este ticket não aceita novos períodos de trabalho.",
        );
      }
      if (
        ticket.status === TicketStatus.NEW ||
        ticket.status === TicketStatus.TRIAGE
      ) {
        throw new ApiError(
          409,
          "TRIAGE_REQUIRED",
          "Aprove a triagem antes de iniciar o atendimento.",
        );
      }
      const mustSyncInitialContact = Boolean(
        ticket.externalInstanceId && ticket.resolutionCycle === 1,
      );
      if (mustSyncInitialContact) {
        const triageSync = await tx.syncExecution.findFirst({
          where: {
            ticketId,
            event: "ticket.triage_approved",
            direction: SyncDirection.OUTBOUND,
          },
          orderBy: { createdAt: "desc" },
          select: { status: true },
        });
        if (triageSync?.status !== SyncStatus.SUCCEEDED) {
          throw new ApiError(
            409,
            "ZEEV_TRIAGE_SYNC_PENDING",
            "A triagem ainda não foi concluída no Zeev. Corrija ou tente novamente a sincronização antes de registrar o contato inicial.",
          );
        }
      }
      if (mustSyncInitialContact && !zeevProcessTasks().contact) {
        throw new ApiError(
          422,
          "ZEEV_CONTACT_TASK_NOT_CONFIGURED",
          "Configure ZEEV_TASK_CONTACT_CODE antes de registrar o contato inicial de tickets do Zeev.",
        );
      }

      const existing = await tx.ticketWorkPeriod.findFirst({
        where: { userId, endedAt: null },
      });
      if (existing) {
        if (existing.ticketId === ticketId) {
          const contactKey =
            existing.cycle === 1 && zeevProcessTasks().contact
              ? `zeev:${ticket.externalReference}:contact:${existing.cycle}`
              : null;
          return { period: existing, queuedContactKey: contactKey };
        }
        throw new ApiError(
          409,
          "WORK_PERIOD_ACTIVE",
          "Finalize o atendimento em andamento antes de iniciar outro.",
        );
      }

      const period = await tx.ticketWorkPeriod.create({
        data: {
          ticketId,
          userId,
          cycle: ticket.resolutionCycle,
          startedAt: new Date(),
          startRequestKey: requestKey,
        },
      });
      if (normalizedContactMessage) {
        await tx.ticketComment.create({
          data: {
            ticketId,
            authorId: userId,
            body: normalizedContactMessage,
            internal: false,
            requestKey: `contact:${requestKey}`,
          },
        });
        await addTicketHistory(tx, {
          ticketId,
          action: "INITIAL_CONTACT_RECORDED",
          actorId: userId,
          fromStatus: ticket.status,
          toStatus: TicketStatus.IN_PROGRESS,
          details: {
            message: normalizedContactMessage,
            synchronizedWithZeev: Boolean(ticket.externalInstanceId),
          },
        });
      }
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.IN_PROGRESS,
          assigneeId: ticket.assigneeId ?? userId,
          version: { increment: 1 },
        },
      });
      await addTicketHistory(tx, {
        ticketId,
        action: "WORK_STARTED",
        actorId: userId,
        fromStatus: ticket.status,
        toStatus: TicketStatus.IN_PROGRESS,
        details: { requestKey, workPeriodId: period.id },
      });
      const contactKey = `zeev:${ticket.externalReference}:contact:${ticket.resolutionCycle}`;
      if (mustSyncInitialContact) {
        await tx.syncExecution.upsert({
          where: { idempotencyKey: contactKey },
          create: {
            ticketId,
            idempotencyKey: contactKey,
            event: "ticket.contact_started",
            direction: SyncDirection.OUTBOUND,
            status: SyncStatus.PENDING,
            payload: {
              externalReference: ticket.externalReference,
              instanceId: ticket.externalInstanceId,
              assignmentId: ticket.zeevAssignmentId,
              resolutionCycle: ticket.resolutionCycle,
              contactMessage:
                normalizedContactMessage ??
                "Contato inicial iniciado pelo Help Desk.",
            },
          },
          update: {},
        });
        return { period, queuedContactKey: contactKey };
      }
      return { period, queuedContactKey: null as string | null };
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }

    // A unique index is the final guard against two simultaneous starts. Once
    // the winning transaction commits, resolve the losing request to the same
    // semantic result instead of leaking a database error to the user.
    const [replay, active, ticket] = await Promise.all([
      prisma.ticketWorkPeriod.findUnique({
        where: { startRequestKey: requestKey },
      }),
      prisma.ticketWorkPeriod.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: "desc" },
      }),
      prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { externalReference: true },
      }),
    ]);
    if (!ticket) {
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    }
    const period = replay ?? active;
    if (!period || period.ticketId !== ticketId) {
      throw new ApiError(
        409,
        "WORK_PERIOD_ACTIVE",
        "Finalize o atendimento em andamento antes de iniciar outro.",
      );
    }
    if (replay && replay.userId !== userId) {
      throw new ApiError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Esta chave já iniciou outro período de trabalho.",
      );
    }
    result = {
      period,
      queuedContactKey: zeevProcessTasks().contact
        ? `zeev:${ticket.externalReference}:contact:${period.cycle}`
        : null,
    };
  }
  const { period, queuedContactKey } = result;
  if (queuedContactKey) await queueZeevSync(queuedContactKey);
  return period;
}

export async function approveTicketTriage(input: {
  ticketId: string;
  actorId: string;
  assigneeId: string;
  reason?: string;
  version: number;
  requestKey: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
    });
    if (!ticket)
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");

    const existingRequest = await tx.syncExecution.findUnique({
      where: { idempotencyKey: input.requestKey },
    });
    if (existingRequest) {
      if (
        existingRequest.ticketId !== ticket.id ||
        existingRequest.event !== "ticket.triage_approved"
      ) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Esta chave já foi usada em outra aprovação de triagem.",
        );
      }
      return { ticket, syncKey: existingRequest.idempotencyKey };
    }

    if (
      ticket.status !== TicketStatus.NEW &&
      ticket.status !== TicketStatus.TRIAGE
    ) {
      throw new ApiError(
        409,
        "TRIAGE_ALREADY_COMPLETED",
        "A triagem deste ticket já foi concluída.",
      );
    }
    if (ticket.version !== input.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado. Atualize a página.",
      );
    }

    const assignee = await tx.userRef.findUnique({
      where: { id: input.assigneeId },
      select: { id: true, active: true },
    });
    if (!assignee?.active) {
      throw new ApiError(
        422,
        "ASSIGNEE_INVALID",
        "O responsável precisa estar ativo.",
      );
    }

    const claimed = await tx.ticket.updateMany({
      where: {
        id: ticket.id,
        version: input.version,
        status: { in: [TicketStatus.NEW, TicketStatus.TRIAGE] },
      },
      data: {
        assigneeId: assignee.id,
        status: TicketStatus.IN_PROGRESS,
        version: { increment: 1 },
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado. Atualize a página.",
      );
    }

    if (ticket.assigneeId && ticket.assigneeId !== assignee.id) {
      await tx.ticketParticipant.updateMany({
        where: {
          ticketId: ticket.id,
          userId: ticket.assigneeId,
          role: "PRIMARY",
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
    }
    const primaryParticipant = await tx.ticketParticipant.findFirst({
      where: {
        ticketId: ticket.id,
        userId: assignee.id,
        role: "PRIMARY",
        removedAt: null,
      },
    });
    if (!primaryParticipant) {
      await tx.ticketParticipant.create({
        data: {
          ticketId: ticket.id,
          userId: assignee.id,
          role: "PRIMARY",
          addedById: input.actorId,
        },
      });
    }

    const updated = await tx.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    await addTicketHistory(tx, {
      ticketId: ticket.id,
      action: "TRIAGE_APPROVED_IN_HELP_DESK",
      actorId: input.actorId,
      fromStatus: ticket.status,
      toStatus: updated.status,
      details: {
        assigneeId: assignee.id,
        reason: input.reason?.trim() || null,
        checklist: {
          classificationConfirmed: true,
          assignmentConfirmed: true,
        },
      },
    });

    if (!ticket.externalInstanceId) return { ticket: updated, syncKey: null };

    if (!zeevProcessTasks().triage) {
      throw new ApiError(
        422,
        "ZEEV_TRIAGE_TASK_NOT_CONFIGURED",
        "Configure ZEEV_TASK_TRIAGE_CODE antes de aprovar a triagem de tickets do Zeev.",
      );
    }
    const syncKey = `zeev:${ticket.externalReference}:triage:${ticket.resolutionCycle}`;
    await tx.syncExecution.upsert({
      where: { idempotencyKey: syncKey },
      create: {
        ticketId: ticket.id,
        idempotencyKey: syncKey,
        event: "ticket.triage_approved",
        direction: SyncDirection.OUTBOUND,
        status: SyncStatus.PENDING,
        payload: {
          instanceId: ticket.externalInstanceId,
          externalReference: ticket.externalReference,
          assigneeId: assignee.id,
          reason: input.reason?.trim() || null,
          resolutionCycle: ticket.resolutionCycle,
          requestKey: input.requestKey,
        },
      },
      update: {},
    });
    return { ticket: updated, syncKey };
  });

  if (result.syncKey) await queueZeevSync(result.syncKey);
  return result.ticket;
}

export async function stopTicketWork(
  ticketId: string,
  userId: string,
  requestKey: string,
) {
  return prisma.$transaction(async (tx) => {
    const replay = await tx.ticketWorkPeriod.findUnique({
      where: { stopRequestKey: requestKey },
    });
    if (replay) {
      if (replay.ticketId !== ticketId || replay.userId !== userId) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Esta chave já finalizou outro período de trabalho.",
        );
      }
      return replay;
    }
    const period = await tx.ticketWorkPeriod.findFirst({
      where: { ticketId, userId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!period)
      throw new ApiError(
        409,
        "NO_ACTIVE_WORK",
        "Não há atendimento ativo neste ticket.",
      );
    const endedAt = new Date();
    const claim = await tx.ticketWorkPeriod.updateMany({
      where: { id: period.id, endedAt: null },
      data: { endedAt, stopRequestKey: requestKey },
    });
    if (claim.count === 0) {
      const completed = await tx.ticketWorkPeriod.findUnique({
        where: { id: period.id },
      });
      if (completed?.stopRequestKey === requestKey) return completed;
      throw new ApiError(
        409,
        "WORK_PERIOD_CHANGED",
        "O período de trabalho já foi finalizado em outra sessão.",
      );
    }
    const updated = await tx.ticketWorkPeriod.findUniqueOrThrow({
      where: { id: period.id },
    });
    await addTicketHistory(tx, {
      ticketId,
      action: "WORK_STOPPED",
      actorId: userId,
      details: {
        workPeriodId: period.id,
        durationSeconds: Math.max(
          0,
          Math.floor((endedAt.getTime() - period.startedAt.getTime()) / 1000),
        ),
      },
    });
    return updated;
  });
}

async function consolidateTicketTime(
  tx: Prisma.TransactionClient,
  ticketId: string,
  cycle: number,
) {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    include: {
      costCenter: true,
      workPeriods: { where: { cycle, valid: true, endedAt: { not: null } } },
    },
  });
  if (!ticket)
    throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");

  const byUser = new Map<string, typeof ticket.workPeriods>();
  for (const period of ticket.workPeriods) {
    const list = byUser.get(period.userId) ?? [];
    list.push(period);
    byUser.set(period.userId, list);
  }

  for (const [userId, periods] of byUser) {
    const startedAt = new Date(
      Math.min(...periods.map((period) => period.startedAt.getTime())),
    );
    const endedAt = new Date(
      Math.max(...periods.map((period) => period.endedAt!.getTime())),
    );
    const durationSeconds = periods.reduce(
      (total, period) =>
        total +
        Math.max(
          0,
          Math.floor(
            (period.endedAt!.getTime() - period.startedAt.getTime()) / 1000,
          ),
        ),
      0,
    );
    if (durationSeconds === 0) continue;

    const idempotencyKey = `ticket:${ticket.id}:user:${userId}:cycle:${cycle}`;
    await tx.timeEntry.upsert({
      where: { idempotencyKey },
      create: {
        userId,
        ticketId: ticket.id,
        costCenterId: ticket.costCenterId,
        source: TimeEntrySource.TICKET,
        status: ticket.costCenterId
          ? TimeEntryStatus.VALID
          : TimeEntryStatus.PENDING_CLASSIFICATION,
        description: ticket.title,
        startedAt,
        endedAt,
        durationSeconds,
        billable: Boolean(ticket.costCenterId),
        projectNameSnapshot: ticket.costCenter?.name,
        ticketNumberSnapshot: ticket.number,
        idempotencyKey,
      },
      update: {
        startedAt,
        endedAt,
        durationSeconds,
        description: ticket.title,
      },
    });
  }
}

export async function resolveTicket(input: {
  ticketId: string;
  userId: string;
  resolutionSummary: string;
  version: number;
  requestKey: string;
}) {
  const replay = await prisma.syncExecution.findUnique({
    where: { idempotencyKey: input.requestKey },
  });
  if (replay?.ticketId) {
    if (
      replay.ticketId !== input.ticketId ||
      replay.event !== "ticket.resolved"
    ) {
      throw new ApiError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Esta chave já foi usada em outra conclusão.",
      );
    }
    const replayTicket = await prisma.ticket.findUnique({
      where: { id: replay.ticketId },
    });
    if (replayTicket) {
      await queueZeevSyncChain([
        replayTicket.resolutionCycle === 1 && zeevProcessTasks().contact
          ? `zeev:${replayTicket.externalReference}:contact:${replayTicket.resolutionCycle}`
          : null,
        input.requestKey,
      ]);
      return replayTicket;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      include: {
        assignee: { select: { name: true } },
        costCenter: { select: { code: true } },
      },
    });
    if (!ticket)
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    if (ticket.status === TicketStatus.RESOLVED) {
      const existingResolution = await tx.syncExecution.findFirst({
        where: { ticketId: ticket.id, event: "ticket.resolved" },
        orderBy: { createdAt: "desc" },
        select: { idempotencyKey: true },
      });
      return {
        ticket,
        resolveKey: existingResolution?.idempotencyKey ?? null,
      };
    }
    if (
      ticket.status === TicketStatus.REOPENED_LOW_SCORE &&
      ticket.externalInstanceId
    ) {
      throw new ApiError(
        409,
        "ZEEV_DEVIATION_REVIEW_REQUIRED",
        "Este ticket recebeu avaliação baixa. Use a revisão de desvio para sincronizar a próxima decisão com o Zeev.",
      );
    }
    if (ticket.version !== input.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado por outra pessoa. Atualize a página.",
      );
    }
    if (ticket.externalInstanceId && !zeevProcessTasks().service) {
      throw new ApiError(
        422,
        "ZEEV_SERVICE_TASK_NOT_CONFIGURED",
        "Configure ZEEV_TASK_SERVICE_CODE antes de finalizar tickets do Zeev.",
      );
    }

    await tx.ticketWorkPeriod.updateMany({
      where: { ticketId: ticket.id, endedAt: null },
      data: { endedAt: new Date() },
    });
    await consolidateTicketTime(tx, ticket.id, ticket.resolutionCycle);

    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.WAITING_APPROVAL,
        resolutionSummary: input.resolutionSummary,
        resolvedAt: new Date(),
        assigneeId: ticket.assigneeId ?? input.userId,
        version: { increment: 1 },
      },
    });
    await addTicketHistory(tx, {
      ticketId: ticket.id,
      action: "RESOLVED_IN_HELP_DESK",
      actorId: input.userId,
      fromStatus: ticket.status,
      toStatus: TicketStatus.WAITING_APPROVAL,
      details: { resolutionSummary: input.resolutionSummary },
    });
    const publicComments = await tx.ticketComment.findMany({
      where: { ticketId: ticket.id, internal: false },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    await tx.syncExecution.upsert({
      where: { idempotencyKey: input.requestKey },
      create: {
        ticketId: ticket.id,
        idempotencyKey: input.requestKey,
        event: "ticket.resolved",
        direction: SyncDirection.OUTBOUND,
        status: SyncStatus.PENDING,
        payload: {
          externalReference: ticket.externalReference,
          instanceId: ticket.externalInstanceId,
          assignmentId: ticket.zeevAssignmentId,
          ticketNumber: ticket.number,
          resolutionSummary: input.resolutionSummary,
          resolvedBy: input.userId,
          assigneeName: ticket.assignee?.name ?? null,
          costCenter: ticket.costCenter?.code ?? null,
          resolutionCycle: ticket.resolutionCycle,
          comments: publicComments.map((comment) => ({
            author: comment.author.name,
            body: comment.body,
            createdAt: comment.createdAt.toISOString(),
          })),
        },
      },
      update: {},
    });
    return { ticket: updated, resolveKey: input.requestKey };
  });

  const contactKey =
    result.ticket.resolutionCycle === 1 && zeevProcessTasks().contact
      ? `zeev:${result.ticket.externalReference}:contact:${result.ticket.resolutionCycle}`
      : null;
  await queueZeevSyncChain([contactKey, result.resolveKey]);
  return result.ticket;
}

export async function approveTicketConclusion(input: {
  ticketId: string;
  userId: string;
  version: number;
  requestKey: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
    });
    if (!ticket) {
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    }

    const syncKey = ticket.externalInstanceId
      ? `zeev:${ticket.externalReference}:approve:${ticket.resolutionCycle}`
      : null;
    if (syncKey) {
      const replay = await tx.syncExecution.findUnique({
        where: { idempotencyKey: syncKey },
      });
      if (replay) {
        if (
          replay.ticketId !== ticket.id ||
          replay.event !== "ticket.internal_approved"
        ) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "A aprovação desta conclusão já está vinculada a outra operação.",
          );
        }
        return { ticket, syncKey };
      }
    }

    if (ticket.status !== TicketStatus.WAITING_APPROVAL) {
      throw new ApiError(
        409,
        "TICKET_NOT_WAITING_APPROVAL",
        "Este ticket não está aguardando aprovação da conclusão.",
      );
    }
    if (ticket.version !== input.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado por outra pessoa. Atualize a página.",
      );
    }
    if (ticket.externalInstanceId && !zeevProcessTasks().approve) {
      throw new ApiError(
        422,
        "ZEEV_APPROVE_TASK_NOT_CONFIGURED",
        "Configure ZEEV_TASK_APPROVE_CODE antes de aprovar a conclusão de tickets do Zeev.",
      );
    }

    const stageReady = await tx.syncExecution.findMany({
      where: {
        ticketId: ticket.id,
        event: "ticket.stage_ready",
        direction: SyncDirection.INBOUND,
      },
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });
    if (
      ticket.externalInstanceId &&
      !stageReady.some((item) =>
        stageIsReady(item.payload, "INTERNAL_APPROVAL", ticket.resolutionCycle),
      )
    ) {
      throw new ApiError(
        409,
        "ZEEV_APPROVAL_NOT_READY",
        "A tarefa Aprovar conclusão ainda não está pronta no Zeev.",
      );
    }

    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.RESOLVED,
        version: { increment: 1 },
      },
    });
    await addTicketHistory(tx, {
      ticketId: ticket.id,
      action: "INTERNAL_APPROVAL_CONFIRMED",
      actorId: input.userId,
      fromStatus: ticket.status,
      toStatus: TicketStatus.RESOLVED,
      details: { resolutionCycle: ticket.resolutionCycle },
    });

    if (!ticket.externalInstanceId) return { ticket: updated, syncKey: null };
    if (!syncKey) return { ticket: updated, syncKey: null };
    await tx.syncExecution.upsert({
      where: { idempotencyKey: syncKey },
      create: {
        ticketId: ticket.id,
        idempotencyKey: syncKey,
        event: "ticket.internal_approved",
        direction: SyncDirection.OUTBOUND,
        status: SyncStatus.PENDING,
        payload: {
          externalReference: ticket.externalReference,
          instanceId: ticket.externalInstanceId,
          resolutionSummary: ticket.resolutionSummary,
          resolutionCycle: ticket.resolutionCycle,
          requestKey: input.requestKey,
        },
      },
      update: {},
    });
    return { ticket: updated, syncKey };
  });

  if (result.syncKey) await queueZeevSync(result.syncKey);
  return result.ticket;
}

export async function reviewTicketDeviation(input: {
  ticketId: string;
  userId: string;
  action: "REQUEST_REEVALUATION" | "CLOSE_TICKET";
  version: number;
  requestKey: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
    });
    if (!ticket) {
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    }
    const syncKey = ticket.externalInstanceId
      ? `zeev:${ticket.externalReference}:deviation:${ticket.resolutionCycle}`
      : null;
    if (syncKey) {
      const replay = await tx.syncExecution.findUnique({
        where: { idempotencyKey: syncKey },
      });
      if (replay) {
        if (
          replay.ticketId !== ticket.id ||
          replay.event !== "ticket.deviation_reviewed"
        ) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "A revisão deste desvio já está vinculada a outra operação.",
          );
        }
        return { ticket, syncKey };
      }
    }
    if (ticket.status !== TicketStatus.REOPENED_LOW_SCORE) {
      throw new ApiError(
        409,
        "TICKET_NOT_REOPENED",
        "Este ticket não está aguardando revisão de desvio.",
      );
    }
    if (ticket.version !== input.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado por outra pessoa. Atualize a página.",
      );
    }
    if (ticket.externalInstanceId && !zeevProcessTasks().deviation) {
      throw new ApiError(
        422,
        "ZEEV_DEVIATION_TASK_NOT_CONFIGURED",
        "Configure ZEEV_TASK_DEVIATION_CODE antes de revisar desvios de tickets do Zeev.",
      );
    }
    const stages = await tx.syncExecution.findMany({
      where: {
        ticketId: ticket.id,
        event: "ticket.stage_ready",
        direction: SyncDirection.INBOUND,
      },
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });
    if (
      ticket.externalInstanceId &&
      !stages.some((item) =>
        stageIsReady(item.payload, "DEVIATION_REVIEW", ticket.resolutionCycle),
      )
    ) {
      throw new ApiError(
        409,
        "ZEEV_DEVIATION_NOT_READY",
        "A tarefa Verificar desvio ainda não está pronta no Zeev.",
      );
    }

    const isClosing = input.action === "CLOSE_TICKET";
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: isClosing ? TicketStatus.CLOSED : TicketStatus.RESOLVED,
        closedAt: isClosing ? new Date() : null,
        version: { increment: 1 },
      },
    });
    await addTicketHistory(tx, {
      ticketId: ticket.id,
      action: "DEVIATION_REVIEWED",
      actorId: input.userId,
      fromStatus: ticket.status,
      toStatus: updated.status,
      details: {
        action: input.action,
        resolutionCycle: ticket.resolutionCycle,
      },
    });
    if (!syncKey) return { ticket: updated, syncKey: null };
    await tx.syncExecution.create({
      data: {
        ticketId: ticket.id,
        idempotencyKey: syncKey,
        event: "ticket.deviation_reviewed",
        direction: SyncDirection.OUTBOUND,
        status: SyncStatus.PENDING,
        payload: {
          instanceId: ticket.externalInstanceId,
          externalReference: ticket.externalReference,
          action: input.action,
          resolutionCycle: ticket.resolutionCycle,
          requestKey: input.requestKey,
        },
      },
    });
    return { ticket: updated, syncKey };
  });

  if (result.syncKey) await queueZeevSync(result.syncKey);
  return result.ticket;
}

export async function queueZeevSync(idempotencyKey: string) {
  const { enqueueZeevSync } = await import("@/lib/jobs/zeev-sync-queue");
  await enqueueZeevSync([idempotencyKey]);
}

export async function queueZeevSyncChain(keys: Array<string | null>) {
  const uniqueKeys = [
    ...new Set(keys.filter((key): key is string => Boolean(key))),
  ];
  if (uniqueKeys.length === 0) return;
  const { enqueueZeevSync } = await import("@/lib/jobs/zeev-sync-queue");
  await enqueueZeevSync(uniqueKeys);
}

export async function retryTicketZeevSync(input: {
  ticketId: string;
  executionId: string;
}) {
  const execution = await prisma.$transaction(async (tx) => {
    const existing = await tx.syncExecution.findFirst({
      where: {
        id: input.executionId,
        ticketId: input.ticketId,
        direction: SyncDirection.OUTBOUND,
      },
      select: { id: true, idempotencyKey: true, status: true },
    });
    if (!existing) {
      throw new ApiError(
        404,
        "SYNC_EXECUTION_NOT_FOUND",
        "Sincronização de saída não encontrada para este ticket.",
      );
    }
    if (existing.status === SyncStatus.SUCCEEDED) {
      throw new ApiError(
        409,
        "SYNC_ALREADY_SUCCEEDED",
        "Esta etapa já foi sincronizada com o Zeev.",
      );
    }
    if (existing.status === SyncStatus.PROCESSING) {
      throw new ApiError(
        409,
        "SYNC_ALREADY_PROCESSING",
        "Esta etapa já está sendo sincronizada com o Zeev.",
      );
    }
    return tx.syncExecution.update({
      where: { id: existing.id },
      data: { status: SyncStatus.PENDING, attempts: 0, lastError: null },
      select: { idempotencyKey: true },
    });
  });

  // A person deliberately requested this retry. Dispatch it now instead of
  // inheriting pg-boss's delayed exponential backoff from the prior failure.
  // The durable outbox continues to retain the result when the remote API is
  // unavailable, so no state is lost if this immediate attempt also fails.
  return dispatchPendingZeevSync(execution.idempotencyKey);
}

export async function dispatchPendingZeevSync(idempotencyKey: string) {
  const processingStartedAt = new Date();
  const staleBefore = new Date(processingStartedAt.getTime() - 120_000);
  const claimed = await prisma.syncExecution.updateMany({
    where: {
      idempotencyKey,
      direction: SyncDirection.OUTBOUND,
      OR: [
        { status: SyncStatus.PENDING },
        { status: SyncStatus.FAILED },
        {
          status: SyncStatus.PROCESSING,
          processingStartedAt: { lt: staleBefore },
        },
      ],
    },
    data: { status: SyncStatus.PROCESSING, processingStartedAt },
  });
  if (claimed.count === 0) {
    return prisma.syncExecution.findUnique({ where: { idempotencyKey } });
  }

  const execution = await prisma.syncExecution.findUnique({
    where: { idempotencyKey },
  });
  if (!execution) return execution;

  try {
    if (isRealZeevApiEnabled()) {
      return await dispatchZeevApi(execution);
    }
  } catch (error) {
    return prisma.syncExecution.update({
      where: { id: execution.id },
      data: {
        status: SyncStatus.FAILED,
        attempts: { increment: 1 },
        processingStartedAt: null,
        lastError:
          error instanceof Error ? error.message : "Falha desconhecida",
      },
    });
  }

  const callbackUrl = process.env.ZEEV_CALLBACK_URL;
  if (!callbackUrl) {
    return prisma.syncExecution.update({
      where: { id: execution.id },
      data: {
        status: SyncStatus.FAILED,
        attempts: { increment: 1 },
        processingStartedAt: null,
        lastError: "ZEEV_CALLBACK_URL não configurada",
      },
    });
  }

  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.ZEEV_CALLBACK_TOKEN ?? ""}`,
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        event: execution.event,
        payload: execution.payload,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const responseBody = await response
      .json()
      .catch(() => ({ status: response.status }));
    if (!response.ok)
      throw new Error(`Callback retornou HTTP ${response.status}`);
    return prisma.syncExecution.update({
      where: { id: execution.id },
      data: {
        status: SyncStatus.SUCCEEDED,
        attempts: { increment: 1 },
        processingStartedAt: null,
        response: responseBody as Prisma.InputJsonValue,
        lastError: null,
      },
    });
  } catch (error) {
    return prisma.syncExecution.update({
      where: { id: execution.id },
      data: {
        status: SyncStatus.FAILED,
        attempts: { increment: 1 },
        processingStartedAt: null,
        lastError:
          error instanceof Error ? error.message : "Falha desconhecida",
      },
    });
  }
}

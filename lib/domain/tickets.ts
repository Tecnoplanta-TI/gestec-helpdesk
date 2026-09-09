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
) {
  let result: {
    period: TicketWorkPeriod;
    queuedContactKey: string | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
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
        const contactKey = zeevProcessTasks().contact
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

      const existing = await tx.ticketWorkPeriod.findFirst({
        where: { userId, endedAt: null },
      });
      if (existing) {
        if (existing.ticketId === ticketId) {
          const contactKey = zeevProcessTasks().contact
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
      if (zeevProcessTasks().contact) {
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
      const tasks = zeevProcessTasks();
      await queueZeevSyncChain([
        tasks.contact
          ? `zeev:${replayTicket.externalReference}:contact:${replayTicket.resolutionCycle}`
          : null,
        input.requestKey,
        tasks.approve
          ? `zeev:${replayTicket.externalReference}:approve:${replayTicket.resolutionCycle}`
          : null,
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
        approveKey: zeevProcessTasks().approve
          ? `zeev:${ticket.externalReference}:approve:${ticket.resolutionCycle}`
          : null,
      };
    }
    if (ticket.version !== input.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado por outra pessoa. Atualize a página.",
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
        status: TicketStatus.RESOLVED,
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
      toStatus: TicketStatus.RESOLVED,
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
    const approveKey = zeevProcessTasks().approve
      ? `zeev:${ticket.externalReference}:approve:${ticket.resolutionCycle}`
      : null;
    if (approveKey) {
      await tx.syncExecution.upsert({
        where: { idempotencyKey: approveKey },
        create: {
          ticketId: ticket.id,
          idempotencyKey: approveKey,
          event: "ticket.internal_approved",
          direction: SyncDirection.OUTBOUND,
          status: SyncStatus.PENDING,
          payload: {
            externalReference: ticket.externalReference,
            instanceId: ticket.externalInstanceId,
            resolutionSummary: input.resolutionSummary,
            resolutionCycle: ticket.resolutionCycle,
          },
        },
        update: {},
      });
    }
    return { ticket: updated, resolveKey: input.requestKey, approveKey };
  });

  const contactKey = zeevProcessTasks().contact
    ? `zeev:${result.ticket.externalReference}:contact:${result.ticket.resolutionCycle}`
    : null;
  await queueZeevSyncChain([contactKey, result.resolveKey, result.approveKey]);
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

export async function dispatchPendingZeevSync(idempotencyKey: string) {
  const execution = await prisma.syncExecution.findUnique({
    where: { idempotencyKey },
  });
  if (!execution || execution.status === SyncStatus.SUCCEEDED) return execution;

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
        lastError:
          error instanceof Error ? error.message : "Falha desconhecida",
      },
    });
  }
}

import { Prisma, TimeEntrySource, TimeEntryStatus } from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";
import { auditSnapshot } from "@/lib/domain/audit";
import { prisma } from "@/lib/prisma";
import { getProject } from "@/lib/domain/projects";
import { findProjectHourlyRateCents } from "@/lib/domain/project-rates";
import { timerStopIdempotencyKey } from "@/lib/domain/time-query";

function timerMatchesStartRequest(
  timer: {
    userId: string;
    description: string;
    costCenterId: string | null;
    manualProjectId: string | null;
    billable: boolean;
  },
  input: {
    userId: string;
    description: string;
    projectId: string;
    billable: boolean;
  },
) {
  const projectId = timer.costCenterId
    ? `cost-center:${timer.costCenterId}`
    : timer.manualProjectId
      ? `manual:${timer.manualProjectId}`
      : "";
  return (
    timer.userId === input.userId &&
    timer.description === input.description &&
    projectId === input.projectId &&
    timer.billable === input.billable
  );
}

export async function startTimer(input: {
  userId: string;
  description: string;
  projectId: string;
  billable: boolean;
  requestKey: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const completedByRequest = await tx.timeEntry.findUnique({
        where: { timerStartRequestKey: input.requestKey },
      });
      if (completedByRequest) {
        if (completedByRequest.userId !== input.userId) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Esta chave de requisição já foi usada em outro timer.",
          );
        }
        throw new ApiError(
          409,
          "TIMER_ALREADY_COMPLETED",
          "Este timer já foi finalizado. Atualize a página antes de iniciar outro.",
        );
      }
      const existingByRequest = await tx.activeTimer.findUnique({
        where: { requestKey: input.requestKey },
      });
      if (existingByRequest) {
        if (!timerMatchesStartRequest(existingByRequest, input)) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Esta chave de requisição já foi usada em outro timer.",
          );
        }
        return existingByRequest;
      }
      const project = await getProject(input.projectId, input.userId, tx);
      const active = await tx.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (active?.requestKey === input.requestKey) {
        if (timerMatchesStartRequest(active, input)) return active;
        throw new ApiError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Esta chave de requisição já foi usada em outro timer.",
        );
      }
      if (active)
        throw new ApiError(
          409,
          "TIMER_ALREADY_ACTIVE",
          "Você já possui um timer em andamento.",
        );
      const timer = await tx.activeTimer.create({
        data: {
          userId: input.userId,
          description: input.description,
          projectName: project.name,
          costCenterId: project.kind === "COST_CENTER" ? project.id : null,
          manualProjectId: project.kind === "MANUAL" ? project.id : null,
          billable: input.billable,
          requestKey: input.requestKey,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: input.userId,
          action: "TIMER_STARTED",
          entityType: "ActiveTimer",
          entityId: timer.id,
          after: auditSnapshot(timer),
        },
      });
      return timer;
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }

    const replay = await prisma.activeTimer.findUnique({
      where: { requestKey: input.requestKey },
    });
    if (replay) {
      if (timerMatchesStartRequest(replay, input)) {
        return replay;
      }
    }
    const completed = await prisma.timeEntry.findUnique({
      where: { timerStartRequestKey: input.requestKey },
    });
    if (completed?.userId === input.userId) {
      throw new ApiError(
        409,
        "TIMER_ALREADY_COMPLETED",
        "Este timer já foi finalizado. Atualize a página antes de iniciar outro.",
      );
    }
    throw new ApiError(
      409,
      "TIMER_ALREADY_ACTIVE",
      "Você já possui um timer em andamento.",
    );
  }
}

export async function updateActiveTimer(
  userId: string,
  input: {
    description?: string;
    projectId?: string;
    billable?: boolean;
    version: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    const timer = await tx.activeTimer.findUnique({ where: { userId } });
    if (!timer)
      throw new ApiError(
        409,
        "NO_ACTIVE_TIMER",
        "Não existe timer em andamento.",
      );
    const project = input.projectId
      ? await getProject(input.projectId, userId, tx)
      : null;
    const changed = await tx.activeTimer.updateMany({
      where: { userId, version: input.version },
      data: {
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.billable !== undefined ? { billable: input.billable } : {}),
        ...(project
          ? {
              projectName: project.name,
              costCenterId: project.kind === "COST_CENTER" ? project.id : null,
              manualProjectId: project.kind === "MANUAL" ? project.id : null,
            }
          : {}),
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O timer foi alterado em outra sessão. Atualize a página.",
      );
    }
    const updated = await tx.activeTimer.findUniqueOrThrow({
      where: { userId },
    });
    await tx.auditEvent.create({
      data: {
        actorId: userId,
        action: "TIMER_UPDATED",
        entityType: "ActiveTimer",
        entityId: timer.id,
        before: auditSnapshot(timer),
        after: auditSnapshot(updated),
      },
    });
    return updated;
  });
}

export async function stopTimer(
  userId: string,
  input: { timerId?: string; requestKey?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const timer = await tx.activeTimer.findUnique({ where: { userId } });
    if (timer && input.timerId && input.timerId !== timer.id) {
      throw new ApiError(
        409,
        "TIMER_CHANGED",
        "O timer ativo mudou. Atualize a página antes de finalizar.",
      );
    }
    const stopKey = timer
      ? timerStopIdempotencyKey(timer.id)
      : input.timerId
        ? timerStopIdempotencyKey(input.timerId)
        : null;

    if (stopKey) {
      const existingByTimer = await tx.timeEntry.findUnique({
        where: { idempotencyKey: stopKey },
      });
      if (existingByTimer) {
        if (existingByTimer.userId !== userId) {
          throw new ApiError(404, "TIMER_NOT_FOUND", "Timer não encontrado.");
        }
        return existingByTimer;
      }
    }
    if (input.requestKey) {
      const existingByRequest = await tx.timeEntry.findUnique({
        where: { timerStopRequestKey: input.requestKey },
      });
      if (existingByRequest) {
        if (existingByRequest.userId !== userId) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Esta chave de requisição já foi usada em outro timer.",
          );
        }
        return existingByRequest;
      }
    }
    if (!timer)
      throw new ApiError(
        409,
        "NO_ACTIVE_TIMER",
        "Não existe timer em andamento.",
      );

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - timer.startedAt.getTime()) / 1000,
    );
    if (durationSeconds <= 0) {
      throw new ApiError(
        422,
        "TIMER_TOO_SHORT",
        "Aguarde ao menos um segundo antes de finalizar o timer.",
      );
    }
    const claimed = await tx.activeTimer.deleteMany({
      where: { id: timer.id, userId },
    });
    if (claimed.count !== 1) {
      const replay = await tx.timeEntry.findUnique({
        where: { idempotencyKey: timerStopIdempotencyKey(timer.id) },
      });
      if (replay?.userId === userId) return replay;
      throw new ApiError(
        409,
        "TIMER_CHANGED",
        "O timer já foi finalizado em outra sessão.",
      );
    }
    const entry = await tx.timeEntry.create({
      data: {
        userId,
        costCenterId: timer.costCenterId,
        manualProjectId: timer.manualProjectId,
        source: TimeEntrySource.TIMER,
        status: TimeEntryStatus.VALID,
        description: timer.description,
        startedAt: timer.startedAt,
        endedAt,
        durationSeconds,
        hourlyRateCentsSnapshot: timer.manualProjectId
          ? await findProjectHourlyRateCents(
              tx,
              timer.manualProjectId,
              timer.startedAt,
            )
          : null,
        billable: timer.billable,
        projectNameSnapshot: timer.projectName,
        idempotencyKey: timerStopIdempotencyKey(timer.id),
        timerStartRequestKey: timer.requestKey,
        timerStopRequestKey: input.requestKey,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: userId,
        action: "TIMER_STOPPED",
        entityType: "TimeEntry",
        entityId: entry.id,
        before: auditSnapshot(timer),
        after: auditSnapshot(entry),
      },
    });
    return entry;
  });
}

export async function createManualTimeEntry(input: {
  userId: string;
  description: string;
  projectId: string;
  billable: boolean;
  startedAt: Date;
  endedAt: Date;
  requestKey: string;
}) {
  const durationSeconds = Math.floor(
    (input.endedAt.getTime() - input.startedAt.getTime()) / 1000,
  );
  if (durationSeconds <= 0 || durationSeconds > 86_400) {
    throw new ApiError(
      422,
      "INVALID_DURATION",
      "A duração deve ser maior que zero e de no máximo 24 horas.",
    );
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.timeEntry.findUnique({
        where: { idempotencyKey: input.requestKey },
      });
      if (existing) {
        const existingProjectId = existing.costCenterId
          ? `cost-center:${existing.costCenterId}`
          : `manual:${existing.manualProjectId}`;
        if (
          existing.userId !== input.userId ||
          existing.source !== TimeEntrySource.MANUAL ||
          existing.description !== input.description ||
          existingProjectId !== input.projectId ||
          existing.billable !== input.billable ||
          existing.startedAt.getTime() !== input.startedAt.getTime() ||
          existing.endedAt.getTime() !== input.endedAt.getTime()
        ) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Esta chave de requisição já foi usada em outro apontamento.",
          );
        }
        return existing;
      }
      const project = await getProject(input.projectId, input.userId, tx);
      const entry = await tx.timeEntry.create({
        data: {
          userId: input.userId,
          costCenterId: project.kind === "COST_CENTER" ? project.id : null,
          manualProjectId: project.kind === "MANUAL" ? project.id : null,
          source: TimeEntrySource.MANUAL,
          description: input.description,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          durationSeconds,
          hourlyRateCentsSnapshot:
            project.kind === "MANUAL"
              ? await findProjectHourlyRateCents(
                  tx,
                  project.id,
                  input.startedAt,
                )
              : null,
          billable: input.billable,
          projectNameSnapshot: project.name,
          idempotencyKey: input.requestKey,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: input.userId,
          action: "TIME_ENTRY_CREATED",
          entityType: "TimeEntry",
          entityId: entry.id,
          after: auditSnapshot(entry),
        },
      });
      return entry;
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const replay = await prisma.timeEntry.findUnique({
      where: { idempotencyKey: input.requestKey },
    });
    const replayProjectId = replay?.costCenterId
      ? `cost-center:${replay.costCenterId}`
      : replay?.manualProjectId
        ? `manual:${replay.manualProjectId}`
        : "";
    if (
      replay?.userId === input.userId &&
      replay.source === TimeEntrySource.MANUAL &&
      replay.description === input.description &&
      replayProjectId === input.projectId &&
      replay.billable === input.billable &&
      replay.startedAt.getTime() === input.startedAt.getTime() &&
      replay.endedAt.getTime() === input.endedAt.getTime()
    ) {
      return replay;
    }
    throw new ApiError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "Esta chave de requisição já foi usada em outro apontamento.",
    );
  }
}

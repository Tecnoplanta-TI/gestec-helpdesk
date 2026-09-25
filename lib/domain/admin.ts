import { randomUUID } from "node:crypto";
import {
  Prisma,
  TicketPriority,
  TicketStatus,
  TimeEntrySource,
  TimeEntryStatus,
} from "@prisma/client";

import { auditSnapshot } from "@/lib/domain/audit";
import { getProjectAny } from "@/lib/domain/projects";
import { findProjectHourlyRateCents } from "@/lib/domain/project-rates";
import { normalizeRequestType } from "@/lib/domain/request-types";
import { ticketClassificationFields } from "@/lib/domain/ticket-classification";
import { ticketInclude } from "@/lib/domain/tickets";
import type {
  adminTicketCreateSchema,
  adminTicketUpdateSchema,
  adminTimeEntryCreateSchema,
  adminTimeEntryBulkDeleteSchema,
  adminTimeEntryBulkUpdateSchema,
  adminTimeEntryDuplicateSchema,
  adminTimeEntryUpdateSchema,
  adminUserSchema,
  adminUserUpdateSchema,
} from "@/lib/domain/schemas";
import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";

type AdminUserInput = z.infer<typeof adminUserSchema>;
type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
type AdminTicketCreate = z.infer<typeof adminTicketCreateSchema>;
type AdminTicketUpdate = z.infer<typeof adminTicketUpdateSchema>;
type AdminTimeEntryCreate = z.infer<typeof adminTimeEntryCreateSchema>;
type AdminTimeEntryBulkUpdate = z.infer<typeof adminTimeEntryBulkUpdateSchema>;
type AdminTimeEntryBulkDelete = z.infer<typeof adminTimeEntryBulkDeleteSchema>;
type AdminTimeEntryDuplicate = z.infer<typeof adminTimeEntryDuplicateSchema>;
type AdminTimeEntryUpdate = z.infer<typeof adminTimeEntryUpdateSchema>;

async function assertUserExists(tx: Prisma.TransactionClient, id: string) {
  const user = await tx.userRef.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) {
    throw new ApiError(422, "USER_NOT_FOUND", "Usuário não encontrado.");
  }
}

export async function createAdminUser(input: {
  actorId: string;
  data: AdminUserInput;
}) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.userRef.create({
      data: {
        id: randomUUID(),
        name: input.data.name,
        email: input.data.email,
        externalId: input.data.externalId,
        role: input.data.role,
        active: input.data.active,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_USER_CREATED",
        entityType: "UserRef",
        entityId: created.id,
        after: auditSnapshot(created),
      },
    });
    return created;
  });
}

export async function updateAdminUser(input: {
  id: string;
  actorId: string;
  data: AdminUserUpdate;
}) {
  if (input.id === input.actorId && input.data.active === false) {
    throw new ApiError(
      422,
      "SELF_DEACTIVATE_FORBIDDEN",
      "Você não pode inativar o próprio usuário.",
    );
  }
  return prisma.$transaction(async (tx) => {
    const current = await tx.userRef.findUnique({ where: { id: input.id } });
    if (!current) {
      throw new ApiError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
    }
    const updated = await tx.userRef.update({
      where: { id: input.id },
      data: input.data,
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_USER_UPDATED",
        entityType: "UserRef",
        entityId: input.id,
        before: auditSnapshot(current),
        after: auditSnapshot(updated),
      },
    });
    return updated;
  });
}

export async function createAdminTicket(input: {
  actorId: string;
  data: AdminTicketCreate;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.data.assigneeId)
      await assertUserExists(tx, input.data.assigneeId);
    if (input.data.costCenterId) {
      const costCenter = await tx.costCenter.findUnique({
        where: { id: input.data.costCenterId },
        select: { id: true },
      });
      if (!costCenter) {
        throw new ApiError(
          422,
          "COST_CENTER_UNAVAILABLE",
          "O centro de custo não existe.",
        );
      }
    }
    let selectedService: { id: string; group: { name: string } } | null = null;
    if (input.data.catalogServiceId) {
      selectedService = await tx.service.findUnique({
        where: { id: input.data.catalogServiceId },
        select: { id: true, group: { select: { name: true } } },
      });
      if (!selectedService) {
        throw new ApiError(422, "SERVICE_UNAVAILABLE", "O serviço não existe.");
      }
    }

    const openedAt = input.data.openedAt ?? new Date();
    const created = await tx.ticket.create({
      data: {
        title: input.data.title,
        description: input.data.description,
        requesterName: input.data.requesterName,
        status: input.data.status ?? TicketStatus.NEW,
        priority: input.data.priority ?? TicketPriority.MEDIUM,
        requestType: input.data.requestType
          ? normalizeRequestType(input.data.requestType)
          : "solicitacao",
        openedAt,
        externalReference:
          input.data.externalReference?.trim() ||
          `HD-${randomUUID().slice(0, 8).toUpperCase()}`,
        assigneeId: input.data.assigneeId ?? null,
        costCenterId: input.data.costCenterId ?? null,
        catalogServiceId: input.data.catalogServiceId ?? null,
        serviceGroup: selectedService?.group.name ?? null,
      },
      include: ticketInclude,
    });
    await tx.ticketHistory.create({
      data: {
        ticketId: created.id,
        action: "ADMIN_TICKET_CREATED",
        actorId: input.actorId,
        toStatus: created.status,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_TICKET_CREATED",
        entityType: "Ticket",
        entityId: created.id,
        after: auditSnapshot(created),
      },
    });
    return created;
  });
}

export async function updateAdminTicket(input: {
  id: string;
  actorId: string;
  data: AdminTicketUpdate;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.ticket.findUnique({ where: { id: input.id } });
    if (!current) {
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    }
    if (current.version !== input.data.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado. Atualize a página.",
      );
    }

    if (input.data.assigneeId) {
      await assertUserExists(tx, input.data.assigneeId);
    }
    if (input.data.costCenterId) {
      const costCenter = await tx.costCenter.findUnique({
        where: { id: input.data.costCenterId },
        select: { id: true },
      });
      if (!costCenter) {
        throw new ApiError(
          422,
          "COST_CENTER_UNAVAILABLE",
          "O centro de custo não existe.",
        );
      }
    }
    let selectedService: { id: string; group: { name: string } } | null = null;
    if (input.data.catalogServiceId) {
      selectedService = await tx.service.findUnique({
        where: { id: input.data.catalogServiceId },
        select: { id: true, group: { select: { name: true } } },
      });
      if (!selectedService) {
        throw new ApiError(422, "SERVICE_UNAVAILABLE", "O serviço não existe.");
      }
    }

    const nextStatus = input.data.status ?? current.status;
    const data: Prisma.TicketUpdateInput = {
      version: { increment: 1 },
    };

    if (input.data.title !== undefined) data.title = input.data.title;
    if (input.data.description !== undefined)
      data.description = input.data.description;
    if (input.data.status !== undefined) data.status = input.data.status;
    if (input.data.priority !== undefined) data.priority = input.data.priority;
    if (input.data.requesterName !== undefined)
      data.requesterName = input.data.requesterName;
    if (input.data.requesterExternalId !== undefined)
      data.requesterExternalId = input.data.requesterExternalId;
    const nextRequestType =
      input.data.requestType !== undefined
        ? input.data.requestType
          ? normalizeRequestType(input.data.requestType)
          : null
        : current.requestType;
    let requestedGroup =
      input.data.serviceGroup !== undefined
        ? input.data.serviceGroup
        : current.serviceGroup;
    if (requestedGroup) {
      const serviceGroup = await tx.serviceGroup.findFirst({
        where: {
          name: { equals: requestedGroup, mode: "insensitive" },
          active: true,
        },
        select: { name: true },
      });
      if (!serviceGroup) {
        throw new ApiError(
          422,
          "SERVICE_GROUP_UNAVAILABLE",
          "O grupo de serviços não está disponível.",
        );
      }
      requestedGroup = serviceGroup.name;
    }
    const keepsSelectedService = Boolean(
      selectedService &&
      (!requestedGroup ||
        selectedService.group.name.localeCompare(requestedGroup, "pt-BR", {
          sensitivity: "accent",
        }) === 0),
    );
    const nextServiceGroup =
      keepsSelectedService && selectedService
        ? selectedService.group.name
        : requestedGroup;
    const classification = ticketClassificationFields({
      requestType: nextRequestType,
      serviceGroup: nextServiceGroup,
    });
    if (input.data.requestType !== undefined)
      data.requestType = nextRequestType;
    if (input.data.service !== undefined) data.service = input.data.service;
    if (
      input.data.serviceGroup !== undefined ||
      input.data.catalogServiceId !== undefined
    )
      data.serviceGroup = nextServiceGroup;
    if (!classification.showApplicationOrProcess) {
      data.applicationOrProcess = null;
    } else if (input.data.applicationOrProcess !== undefined)
      data.applicationOrProcess = input.data.applicationOrProcess;
    if (!classification.showAssetCode) {
      data.assetCode = null;
    } else if (input.data.assetCode !== undefined)
      data.assetCode = input.data.assetCode;
    if (input.data.resolutionSummary !== undefined)
      data.resolutionSummary = input.data.resolutionSummary;
    if (input.data.firstContactDeadline !== undefined)
      data.firstContactDeadline = input.data.firstContactDeadline;
    if (input.data.serviceDeadline !== undefined)
      data.serviceDeadline = input.data.serviceDeadline;
    if (input.data.openedAt !== undefined) data.openedAt = input.data.openedAt;
    if (input.data.resolutionCycle !== undefined)
      data.resolutionCycle = input.data.resolutionCycle;
    if (input.data.externalReference !== undefined)
      data.externalReference = input.data.externalReference;
    if (input.data.externalInstanceId !== undefined)
      data.externalInstanceId = input.data.externalInstanceId;
    if (input.data.externalInstanceUrl !== undefined)
      data.externalInstanceUrl = input.data.externalInstanceUrl;
    if (input.data.zeevTaskCode !== undefined)
      data.zeevTaskCode = input.data.zeevTaskCode;
    if (input.data.zeevAssignmentId !== undefined)
      data.zeevAssignmentId = input.data.zeevAssignmentId;

    if (input.data.resolvedAt !== undefined) {
      data.resolvedAt = input.data.resolvedAt;
    } else if (nextStatus === TicketStatus.RESOLVED && !current.resolvedAt) {
      data.resolvedAt = new Date();
    }

    if (input.data.closedAt !== undefined) {
      data.closedAt = input.data.closedAt;
    } else if (nextStatus === TicketStatus.CLOSED && !current.closedAt) {
      data.closedAt = new Date();
    }

    if (input.data.assigneeId !== undefined) {
      data.assignee = input.data.assigneeId
        ? { connect: { id: input.data.assigneeId } }
        : { disconnect: true };
    }
    if (input.data.costCenterId !== undefined) {
      data.costCenter = input.data.costCenterId
        ? { connect: { id: input.data.costCenterId } }
        : { disconnect: true };
    }
    if (input.data.catalogServiceId !== undefined) {
      data.catalogService =
        keepsSelectedService && selectedService
          ? { connect: { id: selectedService.id } }
          : { disconnect: true };
    }
    if (input.data.requesterId !== undefined) {
      if (input.data.requesterId)
        await assertUserExists(tx, input.data.requesterId);
      data.requester = input.data.requesterId
        ? { connect: { id: input.data.requesterId } }
        : { disconnect: true };
    }

    await tx.ticket.update({
      where: { id: input.id },
      data,
    });

    if (input.data.evaluation !== undefined) {
      const evaluationCycle =
        input.data.resolutionCycle ?? current.resolutionCycle;
      if (input.data.evaluation === null) {
        await tx.ticketEvaluation.deleteMany({
          where: { ticketId: input.id, resolutionCycle: evaluationCycle },
        });
      } else {
        await tx.ticketEvaluation.upsert({
          where: {
            ticketId_resolutionCycle: {
              ticketId: input.id,
              resolutionCycle: evaluationCycle,
            },
          },
          create: {
            ticketId: input.id,
            resolutionCycle: evaluationCycle,
            score: input.data.evaluation.score,
            justification: input.data.evaluation.justification ?? null,
            expectationMet: input.data.evaluation.expectationMet ?? null,
            comments: input.data.evaluation.comments ?? null,
          },
          update: {
            score: input.data.evaluation.score,
            justification: input.data.evaluation.justification ?? null,
            expectationMet: input.data.evaluation.expectationMet ?? null,
            comments: input.data.evaluation.comments ?? null,
          },
        });
      }
    }

    if (input.data.workPeriods) {
      for (const period of input.data.workPeriods) {
        if (period.endedAt && period.endedAt <= period.startedAt) {
          throw new ApiError(
            422,
            "INVALID_WORK_PERIOD",
            "O fim do período deve ser posterior ao início.",
          );
        }
        const updated = await tx.ticketWorkPeriod.updateMany({
          where: { id: period.id, ticketId: input.id },
          data: {
            startedAt: period.startedAt,
            endedAt: period.endedAt === undefined ? undefined : period.endedAt,
            pausedAt:
              period.pausedAt === undefined ? undefined : period.pausedAt,
            valid: period.valid,
            ...(period.cycle !== undefined ? { cycle: period.cycle } : {}),
          },
        });
        if (updated.count !== 1) {
          throw new ApiError(
            404,
            "WORK_PERIOD_NOT_FOUND",
            "Período de atendimento não encontrado neste ticket.",
          );
        }
      }
    }

    const ticketAfter = await tx.ticket.findUniqueOrThrow({
      where: { id: input.id },
      include: ticketInclude,
    });
    await tx.ticketHistory.create({
      data: {
        ticketId: input.id,
        action: "ADMIN_TICKET_UPDATED",
        actorId: input.actorId,
        fromStatus: current.status,
        toStatus: ticketAfter.status,
        details: {
          reason: input.data.reason,
          changedFields: Object.keys(input.data).filter(
            (key) => key !== "version" && key !== "reason",
          ),
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_TICKET_UPDATED",
        entityType: "Ticket",
        entityId: input.id,
        before: auditSnapshot(current),
        after: auditSnapshot(ticketAfter),
      },
    });
    return ticketAfter;
  });
}

export async function createAdminTimeEntry(input: {
  actorId: string;
  data: AdminTimeEntryCreate;
}) {
  const durationSeconds = Math.floor(
    (input.data.endedAt.getTime() - input.data.startedAt.getTime()) / 1000,
  );
  if (durationSeconds <= 0 || durationSeconds > 86_400) {
    throw new ApiError(
      422,
      "INVALID_DURATION",
      "A duração deve ser maior que zero e de no máximo 24 horas.",
    );
  }
  return prisma.$transaction(async (tx) => {
    await assertUserExists(tx, input.data.userId);
    let ticketNumberSnapshot: number | null = null;
    if (input.data.ticketId) {
      const ticket = await tx.ticket.findUnique({
        where: { id: input.data.ticketId },
        select: { id: true, number: true },
      });
      if (!ticket) {
        throw new ApiError(422, "TICKET_NOT_FOUND", "Ticket não encontrado.");
      }
      ticketNumberSnapshot = ticket.number;
    }
    const project = await getProjectAny(input.data.projectId, tx);
    const created = await tx.timeEntry.create({
      data: {
        userId: input.data.userId,
        description: input.data.description,
        billable: input.data.billable,
        startedAt: input.data.startedAt,
        endedAt: input.data.endedAt,
        durationSeconds,
        status: input.data.status ?? TimeEntryStatus.VALID,
        source: input.data.source ?? TimeEntrySource.MANUAL,
        ticketId: input.data.ticketId ?? null,
        ticketNumberSnapshot,
        costCenterId: project.kind === "COST_CENTER" ? project.id : null,
        manualProjectId: project.kind === "MANUAL" ? project.id : null,
        projectNameSnapshot: project.name,
        idempotencyKey: `admin:${randomUUID()}`,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_TIME_ENTRY_CREATED",
        entityType: "TimeEntry",
        entityId: created.id,
        after: auditSnapshot(created),
      },
    });
    return created;
  });
}

export async function updateAdminTimeEntry(input: {
  id: string;
  actorId: string;
  data: AdminTimeEntryUpdate;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.timeEntry.findUnique({ where: { id: input.id } });
    if (!current) {
      throw new ApiError(
        404,
        "TIME_ENTRY_NOT_FOUND",
        "Apontamento não encontrado.",
      );
    }
    if (current.version !== input.data.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O apontamento foi alterado. Atualize a página.",
      );
    }

    if (input.data.userId) await assertUserExists(tx, input.data.userId);
    let ticketNumberSnapshot: number | null | undefined;
    if (input.data.ticketId !== undefined) {
      if (input.data.ticketId) {
        const ticket = await tx.ticket.findUnique({
          where: { id: input.data.ticketId },
          select: { id: true, number: true },
        });
        if (!ticket) {
          throw new ApiError(422, "TICKET_NOT_FOUND", "Ticket não encontrado.");
        }
        ticketNumberSnapshot = ticket.number;
      } else {
        ticketNumberSnapshot = null;
      }
    }

    const startedAt = input.data.startedAt ?? current.startedAt;
    const endedAt = input.data.endedAt ?? current.endedAt;
    const durationSeconds = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000,
    );
    const nextStatus = input.data.status ?? current.status;
    if (
      nextStatus !== TimeEntryStatus.VOIDED &&
      (durationSeconds <= 0 || durationSeconds > 86_400)
    ) {
      throw new ApiError(
        422,
        "INVALID_DURATION",
        "A duração deve ser maior que zero e de no máximo 24 horas.",
      );
    }

    const project = input.data.projectId
      ? await getProjectAny(input.data.projectId, tx)
      : null;

    const result = await tx.timeEntry.updateMany({
      where: { id: input.id, version: input.data.version },
      data: {
        description: input.data.description,
        billable: input.data.billable,
        startedAt,
        endedAt,
        durationSeconds,
        correctionReason: input.data.correctionReason,
        status: input.data.status,
        ...(input.data.source ? { source: input.data.source } : {}),
        ...(input.data.userId ? { userId: input.data.userId } : {}),
        ...(input.data.ticketId !== undefined
          ? {
              ticketId: input.data.ticketId,
              ticketNumberSnapshot,
            }
          : {}),
        ...(project
          ? {
              costCenterId: project.kind === "COST_CENTER" ? project.id : null,
              manualProjectId: project.kind === "MANUAL" ? project.id : null,
              projectNameSnapshot: project.name,
            }
          : {}),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O apontamento foi alterado. Atualize a página.",
      );
    }
    const after = await tx.timeEntry.findUniqueOrThrow({
      where: { id: input.id },
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_TIME_ENTRY_UPDATED",
        entityType: "TimeEntry",
        entityId: input.id,
        before: auditSnapshot(current),
        after: auditSnapshot(after),
      },
    });
    return after;
  });
}

export async function updateAdminTimeEntriesBulk(input: {
  actorId: string;
  data: AdminTimeEntryBulkUpdate;
}) {
  return prisma.$transaction(async (tx) => {
    const ids = input.data.entries.map((entry) => entry.id);
    const currentEntries = await tx.timeEntry.findMany({
      where: { id: { in: ids } },
    });
    if (currentEntries.length !== ids.length) {
      throw new ApiError(
        404,
        "TIME_ENTRY_NOT_FOUND",
        "Um ou mais apontamentos não foram encontrados.",
      );
    }
    const targets = new Map(
      input.data.entries.map((entry) => [entry.id, entry]),
    );
    for (const entry of currentEntries) {
      if (entry.version !== targets.get(entry.id)?.version) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "Um apontamento selecionado foi alterado. Atualize a página e tente novamente.",
        );
      }
      if (entry.status === TimeEntryStatus.VOIDED) {
        throw new ApiError(
          409,
          "TIME_ENTRY_VOIDED",
          "Apontamentos invalidados não podem ser editados em massa.",
        );
      }
    }
    if (input.data.userId) await assertUserExists(tx, input.data.userId);
    const project = input.data.projectId
      ? await getProjectAny(input.data.projectId, tx)
      : null;

    for (const current of currentEntries) {
      const target = targets.get(current.id);
      const startedAt = target?.startedAt ?? current.startedAt;
      const endedAt = target?.endedAt ?? current.endedAt;
      const changesTime = target?.startedAt !== undefined;
      const durationSeconds = changesTime
        ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
        : current.durationSeconds;
      if (changesTime && (durationSeconds <= 0 || durationSeconds > 86_400)) {
        throw new ApiError(
          422,
          "INVALID_DURATION",
          "A duração deve ser maior que zero e de no máximo 24 horas.",
        );
      }
      const hourlyRateCentsSnapshot =
        project?.kind === "MANUAL"
          ? await findProjectHourlyRateCents(tx, project.id, startedAt)
          : project
            ? null
            : undefined;
      const result = await tx.timeEntry.updateMany({
        where: { id: current.id, version: current.version },
        data: {
          userId: input.data.userId,
          description: input.data.description,
          billable: input.data.billable,
          startedAt: target?.startedAt,
          endedAt: target?.endedAt,
          durationSeconds: changesTime ? durationSeconds : undefined,
          correctionReason: input.data.correctionReason,
          hourlyRateCentsSnapshot,
          ...(project
            ? {
                costCenterId:
                  project.kind === "COST_CENTER" ? project.id : null,
                manualProjectId: project.kind === "MANUAL" ? project.id : null,
                projectNameSnapshot: project.name,
              }
            : {}),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "Um apontamento foi alterado durante a operação. Nenhuma alteração foi aplicada.",
        );
      }
      const after = await tx.timeEntry.findUniqueOrThrow({
        where: { id: current.id },
      });
      await tx.auditEvent.create({
        data: {
          actorId: input.actorId,
          action: "ADMIN_TIME_ENTRY_BULK_UPDATED",
          entityType: "TimeEntry",
          entityId: current.id,
          before: auditSnapshot(current),
          after: auditSnapshot(after),
        },
      });
    }
    return { updated: currentEntries.length };
  });
}

export async function duplicateAdminTimeEntry(input: {
  id: string;
  actorId: string;
  data: AdminTimeEntryDuplicate;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.timeEntry.findUnique({ where: { id: input.id } });
    if (!current) {
      throw new ApiError(
        404,
        "TIME_ENTRY_NOT_FOUND",
        "Apontamento não encontrado.",
      );
    }
    if (current.version !== input.data.version) {
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O apontamento foi alterado. Atualize a página e tente novamente.",
      );
    }
    const created = await tx.timeEntry.create({
      data: {
        userId: current.userId,
        ticketId: current.ticketId,
        costCenterId: current.costCenterId,
        manualProjectId: current.manualProjectId,
        source: current.source,
        status: TimeEntryStatus.VALID,
        description: current.description,
        startedAt: current.startedAt,
        endedAt: current.endedAt,
        durationSeconds: current.durationSeconds,
        hourlyRateCentsSnapshot: current.hourlyRateCentsSnapshot,
        billable: current.billable,
        projectNameSnapshot: current.projectNameSnapshot,
        ticketNumberSnapshot: current.ticketNumberSnapshot,
        idempotencyKey: `admin:duplicate:${randomUUID()}`,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_TIME_ENTRY_DUPLICATED",
        entityType: "TimeEntry",
        entityId: created.id,
        before: auditSnapshot(current),
        after: auditSnapshot(created),
      },
    });
    return created;
  });
}

export async function deleteAdminTimeEntriesBulk(input: {
  actorId: string;
  data: AdminTimeEntryBulkDelete;
}) {
  return prisma.$transaction(async (tx) => {
    const ids = input.data.entries.map((entry) => entry.id);
    const currentEntries = await tx.timeEntry.findMany({
      where: { id: { in: ids } },
    });
    if (currentEntries.length !== ids.length) {
      throw new ApiError(
        404,
        "TIME_ENTRY_NOT_FOUND",
        "Um ou mais apontamentos não foram encontrados.",
      );
    }
    const versions = new Map(
      input.data.entries.map((entry) => [entry.id, entry.version]),
    );
    const entriesToVoid = currentEntries.filter(
      (entry) => entry.status !== TimeEntryStatus.VOIDED,
    );
    for (const entry of entriesToVoid) {
      if (entry.version !== versions.get(entry.id)) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "Um apontamento selecionado foi alterado. Atualize a página e tente novamente.",
        );
      }
    }

    for (const current of entriesToVoid) {
      const result = await tx.timeEntry.updateMany({
        where: { id: current.id, version: current.version },
        data: {
          status: TimeEntryStatus.VOIDED,
          billable: false,
          correctionReason: input.data.correctionReason,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) {
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "Um apontamento foi alterado durante a operação. Nenhuma alteração foi aplicada.",
        );
      }
      const after = await tx.timeEntry.findUniqueOrThrow({
        where: { id: current.id },
      });
      await tx.auditEvent.create({
        data: {
          actorId: input.actorId,
          action: "ADMIN_TIME_ENTRY_VOIDED",
          entityType: "TimeEntry",
          entityId: current.id,
          before: auditSnapshot(current),
          after: auditSnapshot(after),
        },
      });
    }
    return { voided: entriesToVoid.length };
  });
}

export async function deleteAdminTimer(input: { id: string; actorId: string }) {
  return prisma.$transaction(async (tx) => {
    const timer = await tx.activeTimer.findUnique({ where: { id: input.id } });
    if (!timer) {
      throw new ApiError(404, "TIMER_NOT_FOUND", "Timer não encontrado.");
    }
    await tx.activeTimer.delete({ where: { id: input.id } });
    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "ADMIN_TIMER_DELETED",
        entityType: "ActiveTimer",
        entityId: input.id,
        before: auditSnapshot(timer),
      },
    });
    return timer;
  });
}

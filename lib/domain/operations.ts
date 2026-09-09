import {
  ParticipantRole,
  Prisma,
  TicketAssetRelation,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";
import { addTicketHistory } from "@/lib/domain/ticket-history";
import { listAssignableUsers } from "@/lib/domain/users";

export { listAssignableUsers };

export const BATCH_LIMIT = 50;

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.TRIAGE, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  TRIAGE: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_REQUESTER,
    TicketStatus.CANCELLED,
  ],
  IN_PROGRESS: [
    TicketStatus.WAITING_REQUESTER,
    TicketStatus.WAITING_APPROVAL,
    TicketStatus.TRIAGE,
  ],
  WAITING_REQUESTER: [TicketStatus.TRIAGE, TicketStatus.IN_PROGRESS],
  WAITING_APPROVAL: [TicketStatus.IN_PROGRESS],
  RESOLVED: [],
  CLOSED: [],
  REOPENED_LOW_SCORE: [TicketStatus.IN_PROGRESS, TicketStatus.TRIAGE],
  CANCELLED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export async function assignTicket(input: {
  ticketId: string;
  actorId: string;
  assigneeId: string | null;
  reason: string;
  version: number;
  canManage?: boolean;
}) {
  if (!input.reason.trim())
    throw new ApiError(
      422,
      "REASON_REQUIRED",
      "Informe o motivo da atribuição.",
    );
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
    });
    if (!ticket)
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    if (ticket.version !== input.version)
      throw new ApiError(
        409,
        "VERSION_CONFLICT",
        "O ticket foi alterado. Atualize a página.",
      );
    const isSelfAssignment =
      input.assigneeId === input.actorId && !ticket.assigneeId;
    if (!input.canManage && !isSelfAssignment) {
      throw new ApiError(
        403,
        "ASSIGNMENT_FORBIDDEN",
        "Você só pode assumir um ticket ainda não atribuído.",
      );
    }
    if (input.assigneeId) {
      const assignee = await tx.userRef.findUnique({
        where: { id: input.assigneeId },
      });
      if (!assignee?.active)
        throw new ApiError(
          422,
          "ASSIGNEE_INVALID",
          "O responsável precisa estar ativo.",
        );
    }

    if (ticket.assigneeId) {
      await tx.ticketParticipant.updateMany({
        where: {
          ticketId: ticket.id,
          userId: ticket.assigneeId,
          role: ParticipantRole.PRIMARY,
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
    }

    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        assigneeId: input.assigneeId,
        status:
          ticket.status === TicketStatus.NEW
            ? TicketStatus.TRIAGE
            : ticket.status,
        version: { increment: 1 },
      },
    });

    if (input.assigneeId) {
      const existing = await tx.ticketParticipant.findFirst({
        where: {
          ticketId: ticket.id,
          userId: input.assigneeId,
          role: ParticipantRole.PRIMARY,
          removedAt: null,
        },
      });
      if (!existing) {
        await tx.ticketParticipant.create({
          data: {
            ticketId: ticket.id,
            userId: input.assigneeId,
            role: ParticipantRole.PRIMARY,
            addedById: input.actorId,
          },
        });
      }
    }

    await addTicketHistory(tx, {
      ticketId: ticket.id,
      action: "ASSIGNEE_CHANGED",
      actorId: input.actorId,
      fromStatus: ticket.status,
      toStatus: updated.status,
      details: {
        previousAssigneeId: ticket.assigneeId,
        assigneeId: input.assigneeId,
        reason: input.reason.trim(),
      },
    });
    return updated;
  });
}

export async function addParticipant(input: {
  ticketId: string;
  actorId: string;
  userId: string;
  role: ParticipantRole;
}) {
  if (input.role === ParticipantRole.PRIMARY) {
    throw new ApiError(
      422,
      "USE_ASSIGN",
      "O responsável principal deve ser definido pela atribuição.",
    );
  }
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
    });
    if (!ticket)
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    if (ticket.assigneeId === input.userId) {
      throw new ApiError(
        409,
        "ALREADY_PRIMARY",
        "Este usuário já é o responsável principal.",
      );
    }
    const user = await tx.userRef.findUnique({ where: { id: input.userId } });
    if (!user?.active)
      throw new ApiError(
        422,
        "USER_INVALID",
        "O colaborador precisa estar ativo.",
      );
    const active = await tx.ticketParticipant.findFirst({
      where: { ticketId: ticket.id, userId: input.userId, removedAt: null },
    });
    if (active) return active;
    const participant = await tx.ticketParticipant.create({
      data: {
        ticketId: ticket.id,
        userId: input.userId,
        role: input.role,
        addedById: input.actorId,
      },
    });
    await addTicketHistory(tx, {
      ticketId: ticket.id,
      action: "PARTICIPANT_ADDED",
      actorId: input.actorId,
      details: { userId: input.userId, role: input.role },
    });
    return participant;
  });
}

export async function removeParticipant(input: {
  ticketId: string;
  participantId: string;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const participant = await tx.ticketParticipant.findUnique({
      where: { id: input.participantId },
    });
    if (
      !participant ||
      participant.ticketId !== input.ticketId ||
      participant.removedAt
    ) {
      throw new ApiError(
        404,
        "PARTICIPANT_NOT_FOUND",
        "Participação não encontrada.",
      );
    }
    if (participant.role === ParticipantRole.PRIMARY) {
      throw new ApiError(
        409,
        "PRIMARY_LOCKED",
        "Transfira o responsável principal em vez de removê-lo.",
      );
    }
    const updated = await tx.ticketParticipant.update({
      where: { id: participant.id },
      data: { removedAt: new Date() },
    });
    await addTicketHistory(tx, {
      ticketId: input.ticketId,
      action: "PARTICIPANT_REMOVED",
      actorId: input.actorId,
      details: { userId: participant.userId, role: participant.role },
    });
    return updated;
  });
}

export async function linkTicketAsset(input: {
  ticketId: string;
  assetId: string;
  actorId: string;
  relationType: TicketAssetRelation;
}) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({ where: { id: input.assetId } });
    if (!asset)
      throw new ApiError(404, "ASSET_NOT_FOUND", "Ativo não encontrado.");
    const existing = await tx.ticketAsset.findUnique({
      where: {
        ticketId_assetId: { ticketId: input.ticketId, assetId: input.assetId },
      },
    });
    const link = existing
      ? await tx.ticketAsset.update({
          where: {
            ticketId_assetId: {
              ticketId: input.ticketId,
              assetId: input.assetId,
            },
          },
          data: {
            removedAt: null,
            relationType: input.relationType,
            linkedById: input.actorId,
          },
        })
      : await tx.ticketAsset.create({
          data: {
            ticketId: input.ticketId,
            assetId: input.assetId,
            relationType: input.relationType,
            linkedById: input.actorId,
          },
        });
    await addTicketHistory(tx, {
      ticketId: input.ticketId,
      action: "ASSET_LINKED",
      actorId: input.actorId,
      details: {
        assetId: input.assetId,
        assetTag: asset.assetTag,
        relationType: input.relationType,
      },
    });
    return link;
  });
}

export async function unlinkTicketAsset(input: {
  ticketId: string;
  assetId: string;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ticketAsset.findUnique({
      where: {
        ticketId_assetId: { ticketId: input.ticketId, assetId: input.assetId },
      },
    });
    if (!existing || existing.removedAt)
      throw new ApiError(
        404,
        "ASSET_LINK_NOT_FOUND",
        "Vínculo de ativo não encontrado.",
      );
    const updated = await tx.ticketAsset.update({
      where: {
        ticketId_assetId: { ticketId: input.ticketId, assetId: input.assetId },
      },
      data: { removedAt: new Date() },
    });
    await addTicketHistory(tx, {
      ticketId: input.ticketId,
      action: "ASSET_UNLINKED",
      actorId: input.actorId,
      details: { assetId: input.assetId },
    });
    return updated;
  });
}

export type BatchAction = "assign" | "priority" | "transition";

export async function applyTicketBatch(input: {
  actorId: string;
  action: BatchAction;
  ticketIds: string[];
  requestKey: string;
  reason: string;
  assigneeId?: string | null;
  priority?: TicketPriority;
  status?: TicketStatus;
}) {
  if (input.ticketIds.length === 0)
    throw new ApiError(422, "EMPTY_BATCH", "Selecione ao menos um ticket.");
  if (input.ticketIds.length > BATCH_LIMIT)
    throw new ApiError(
      422,
      "BATCH_TOO_LARGE",
      `O lote máximo é de ${BATCH_LIMIT} tickets.`,
    );
  if (!input.reason.trim())
    throw new ApiError(
      422,
      "REASON_REQUIRED",
      "Informe o motivo da ação em massa.",
    );

  const replay = await prisma.auditEvent.findFirst({
    where: { action: "TICKET_BATCH", entityId: input.requestKey },
  });
  if (replay?.after && typeof replay.after === "object") {
    return replay.after as {
      results: Array<{ ticketId: string; ok: boolean; message: string }>;
    };
  }

  const uniqueIds = [...new Set(input.ticketIds)];
  const results: Array<{ ticketId: string; ok: boolean; message: string }> = [];

  for (const ticketId of uniqueIds) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });
      if (!ticket)
        throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
      if (input.action === "assign") {
        await assignTicket({
          ticketId,
          actorId: input.actorId,
          assigneeId: input.assigneeId ?? null,
          reason: input.reason,
          version: ticket.version,
          canManage: true,
        });
        results.push({ ticketId, ok: true, message: "Atribuído." });
      } else if (input.action === "priority") {
        if (!input.priority)
          throw new ApiError(422, "PRIORITY_REQUIRED", "Informe a prioridade.");
        await prisma.$transaction(async (tx) => {
          const current = await tx.ticket.findUnique({
            where: { id: ticketId },
          });
          if (!current)
            throw new ApiError(
              404,
              "TICKET_NOT_FOUND",
              "Ticket não encontrado.",
            );
          if (current.version !== ticket.version)
            throw new ApiError(
              409,
              "VERSION_CONFLICT",
              "O ticket foi alterado.",
            );
          await tx.ticket.update({
            where: { id: ticketId },
            data: { priority: input.priority, version: { increment: 1 } },
          });
          await addTicketHistory(tx, {
            ticketId,
            action: "PRIORITY_CHANGED",
            actorId: input.actorId,
            details: {
              from: current.priority,
              to: input.priority,
              reason: input.reason,
              requestKey: input.requestKey,
            },
          });
        });
        results.push({ ticketId, ok: true, message: "Prioridade atualizada." });
      } else {
        if (!input.status)
          throw new ApiError(422, "STATUS_REQUIRED", "Informe a transição.");
        const nextStatus = input.status;
        if (!canTransition(ticket.status, nextStatus)) {
          throw new ApiError(
            409,
            "TRANSITION_NOT_ALLOWED",
            `Não é possível ir de ${ticket.status} para ${nextStatus}.`,
          );
        }
        await prisma.$transaction(async (tx) => {
          const current = await tx.ticket.findUnique({
            where: { id: ticketId },
          });
          if (!current)
            throw new ApiError(
              404,
              "TICKET_NOT_FOUND",
              "Ticket não encontrado.",
            );
          if (current.version !== ticket.version)
            throw new ApiError(
              409,
              "VERSION_CONFLICT",
              "O ticket foi alterado.",
            );
          if (!canTransition(current.status, nextStatus)) {
            throw new ApiError(
              409,
              "TRANSITION_NOT_ALLOWED",
              `Não é possível ir de ${current.status} para ${nextStatus}.`,
            );
          }
          await tx.ticket.update({
            where: { id: ticketId },
            data: { status: nextStatus, version: { increment: 1 } },
          });
          await addTicketHistory(tx, {
            ticketId,
            action: "STATUS_CHANGED",
            actorId: input.actorId,
            fromStatus: current.status,
            toStatus: nextStatus,
            details: { reason: input.reason, requestKey: input.requestKey },
          });
        });
        results.push({ ticketId, ok: true, message: "Transição aplicada." });
      }
    } catch (error) {
      results.push({
        ticketId,
        ok: false,
        message:
          error instanceof ApiError
            ? error.message
            : "Falha ao aplicar a ação.",
      });
    }
  }

  await prisma.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: "TICKET_BATCH",
      entityType: "TicketBatch",
      entityId: input.requestKey,
      after: { action: input.action, results } as Prisma.InputJsonValue,
    },
  });

  return { results };
}

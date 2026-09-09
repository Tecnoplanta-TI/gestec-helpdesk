import { Prisma, TicketStatus } from "@prisma/client";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { normalizeRequestType } from "@/lib/domain/request-types";
import { canTransition } from "@/lib/domain/operations";
import { ticketInclude } from "@/lib/domain/tickets";
import { ticketUpdateSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("tickets:view");
    const { id } = await context.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket)
      throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
    return Response.json(ticket);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = ticketUpdateSchema.parse(await readJson(request));
    if (
      (input.status !== undefined || input.priority !== undefined) &&
      !hasPermission(session.role, "tickets:manage")
    ) {
      throw new ApiError(
        403,
        "TICKET_MANAGEMENT_FORBIDDEN",
        "Somente gestores podem alterar prioridade ou status diretamente.",
      );
    }
    if (input.assigneeId !== undefined) {
      throw new ApiError(
        422,
        "USE_ASSIGN_ENDPOINT",
        "Use a ação de atribuição para alterar o responsável.",
      );
    }
    if (input.resolutionSummary !== undefined) {
      throw new ApiError(
        422,
        "USE_RESOLVE_ENDPOINT",
        "Use a ação de conclusão para registrar a solução.",
      );
    }
    if (
      input.status === TicketStatus.RESOLVED ||
      input.status === TicketStatus.CLOSED
    ) {
      throw new ApiError(
        422,
        "USE_RESOLVE_ENDPOINT",
        "Use a ação de conclusão para encerrar o ticket.",
      );
    }
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.ticket.findUnique({ where: { id } });
      if (!current)
        throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");
      if (current.version !== input.version)
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "O ticket foi alterado. Atualize a página.",
        );
      if (input.status && input.status !== current.status) {
        if (!input.reason)
          throw new ApiError(
            422,
            "REASON_REQUIRED",
            "Informe o motivo da alteração de status.",
          );
        if (!canTransition(current.status, input.status)) {
          throw new ApiError(
            409,
            "TRANSITION_NOT_ALLOWED",
            `Não é possível ir de ${current.status} para ${input.status}.`,
          );
        }
      }
      if (
        input.priority &&
        input.priority !== current.priority &&
        !input.reason
      ) {
        throw new ApiError(
          422,
          "REASON_REQUIRED",
          "Informe o motivo da alteração de prioridade.",
        );
      }
      if (input.costCenterId) {
        const costCenter = await tx.costCenter.findFirst({
          where: { id: input.costCenterId, active: true },
          select: { id: true },
        });
        if (!costCenter)
          throw new ApiError(
            422,
            "COST_CENTER_UNAVAILABLE",
            "O centro de custo não está disponível.",
          );
      }
      if (input.catalogServiceId) {
        const service = await tx.service.findFirst({
          where: {
            id: input.catalogServiceId,
            active: true,
            group: { active: true },
          },
          select: { id: true },
        });
        if (!service)
          throw new ApiError(
            422,
            "SERVICE_UNAVAILABLE",
            "O serviço não está disponível.",
          );
      }
      const data: Prisma.TicketUpdateInput = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.costCenterId !== undefined
          ? {
              costCenter: input.costCenterId
                ? { connect: { id: input.costCenterId } }
                : { disconnect: true },
            }
          : {}),
        ...(input.catalogServiceId !== undefined
          ? {
              catalogService: input.catalogServiceId
                ? { connect: { id: input.catalogServiceId } }
                : { disconnect: true },
            }
          : {}),
        ...(input.requestType
          ? { requestType: normalizeRequestType(input.requestType) }
          : {}),
        version: { increment: 1 },
      };
      const ticket = await tx.ticket.update({
        where: { id },
        data,
        include: ticketInclude,
      });
      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: "TICKET_UPDATED",
          actorId: session.userId,
          fromStatus: current.status,
          toStatus: ticket.status,
          details: {
            changedFields: Object.keys(input).filter(
              (key) => key !== "version",
            ),
          },
        },
      });
      return ticket;
    });
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

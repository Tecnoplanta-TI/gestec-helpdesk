import { Prisma, TicketStatus } from "@prisma/client";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { normalizeRequestType } from "@/lib/domain/request-types";
import { ticketClassificationFields } from "@/lib/domain/ticket-classification";
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
      let selectedService: { id: string; group: { name: string } } | null =
        null;
      if (input.catalogServiceId) {
        selectedService = await tx.service.findFirst({
          where: {
            id: input.catalogServiceId,
            active: true,
            group: { active: true },
          },
          select: { id: true, group: { select: { name: true } } },
        });
        if (!selectedService)
          throw new ApiError(
            422,
            "SERVICE_UNAVAILABLE",
            "O serviço não está disponível.",
          );
      }
      let selectedGroupName: string | null | undefined;
      if (input.serviceGroup !== undefined) {
        if (input.serviceGroup === null) {
          selectedGroupName = null;
        } else {
          const group = await tx.serviceGroup.findFirst({
            where: {
              name: { equals: input.serviceGroup, mode: "insensitive" },
              active: true,
            },
            select: { name: true },
          });
          if (!group)
            throw new ApiError(
              422,
              "SERVICE_GROUP_UNAVAILABLE",
              "O grupo de serviços não está disponível.",
            );
          selectedGroupName = group.name;
        }
      }
      if (
        (input.catalogServiceId !== undefined ||
          input.serviceGroup !== undefined ||
          input.requestType !== undefined ||
          input.service !== undefined ||
          input.applicationOrProcess !== undefined ||
          input.assetCode !== undefined) &&
        current.status !== TicketStatus.NEW &&
        current.status !== TicketStatus.TRIAGE
      ) {
        throw new ApiError(
          409,
          "CLASSIFICATION_LOCKED",
          "A classificação do ticket só pode ser alterada durante a triagem.",
        );
      }
      const nextRequestType = input.requestType
        ? normalizeRequestType(input.requestType)
        : current.requestType;
      const nextServiceGroup = selectedService
        ? selectedService.group.name
        : input.serviceGroup !== undefined
          ? (selectedGroupName ?? null)
          : current.serviceGroup;
      const classification = ticketClassificationFields({
        requestType: nextRequestType,
        serviceGroup: nextServiceGroup,
      });
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
        ...(input.requestType ? { requestType: nextRequestType } : {}),
        ...(input.catalogServiceId !== undefined ||
        input.serviceGroup !== undefined
          ? { serviceGroup: nextServiceGroup }
          : {}),
        ...(input.service !== undefined ? { service: input.service } : {}),
        ...(!classification.showApplicationOrProcess
          ? { applicationOrProcess: null }
          : input.applicationOrProcess !== undefined
            ? { applicationOrProcess: input.applicationOrProcess }
            : {}),
        ...(!classification.showAssetCode
          ? { assetCode: null }
          : input.assetCode !== undefined
            ? { assetCode: input.assetCode }
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

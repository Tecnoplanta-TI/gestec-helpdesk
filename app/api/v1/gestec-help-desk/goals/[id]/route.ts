import { Prisma } from "@prisma/client";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { timeGoalStatusSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("goals:manage");
    const { id } = await context.params;
    const input = timeGoalStatusSchema.parse(await readJson(request));
    const current = await prisma.timeGoal.findUnique({
      where: { id },
    });
    if (!current) {
      throw new ApiError(404, "GOAL_NOT_FOUND", "Meta não encontrada.");
    }

    const canManage =
      hasPermission(session.role, "admin:manage") ||
      current.targetUserId === session.userId;
    if (!canManage) {
      throw new ApiError(
        403,
        "GOAL_FORBIDDEN",
        "Você não pode alterar esta meta.",
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const goal = await tx.timeGoal.update({
        where: { id },
        data: { active: input.active },
        include: {
          targetUser: { select: { id: true, name: true } },
          project: { select: { name: true } },
          client: { select: { name: true } },
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: input.active ? "TIME_GOAL_ACTIVATED" : "TIME_GOAL_DEACTIVATED",
          entityType: "TimeGoal",
          entityId: id,
          before: auditSnapshot(current),
          after: auditSnapshot(goal),
        },
      });
      return goal;
    });

    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("goals:manage");
    const { id } = await context.params;
    const current = await prisma.timeGoal.findUnique({ where: { id } });
    if (!current) {
      throw new ApiError(404, "GOAL_NOT_FOUND", "Meta não encontrada.");
    }

    const canManage =
      hasPermission(session.role, "admin:manage") ||
      current.targetUserId === session.userId;
    if (!canManage) {
      throw new ApiError(
        403,
        "GOAL_FORBIDDEN",
        "Você não pode excluir esta meta.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeGoal.delete({ where: { id } });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "TIME_GOAL_DELETED",
          entityType: "TimeGoal",
          entityId: id,
          before: auditSnapshot(current),
          after: Prisma.JsonNull,
        },
      });
    });

    return Response.json({ id });
  } catch (error) {
    return errorResponse(error);
  }
}

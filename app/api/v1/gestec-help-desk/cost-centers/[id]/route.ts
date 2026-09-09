import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import {
  deleteCostCenter,
  stripCostCenterId,
} from "@/lib/domain/catalog-delete";
import { normalizeProjectName } from "@/lib/domain/projects";
import { costCenterUpdateSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("cost-centers:manage");
    const { id } = await context.params;
    const input = costCenterUpdateSchema.parse(await readJson(request));
    const before = await prisma.costCenter.findUnique({ where: { id } });
    if (!before)
      throw new ApiError(
        404,
        "COST_CENTER_NOT_FOUND",
        "Centro de custo não encontrado.",
      );
    const after = await prisma.$transaction(async (tx) => {
      const normalizedName = input.name
        ? normalizeProjectName(input.name)
        : undefined;
      if (normalizedName) {
        const duplicateManual = await tx.manualProject.findUnique({
          where: { normalizedName },
          select: { id: true },
        });
        if (duplicateManual)
          throw new ApiError(
            409,
            "PROJECT_NAME_CONFLICT",
            "Já existe um projeto manual com este nome.",
          );
      }
      const updated = await tx.costCenter.update({
        where: { id },
        data: { ...input, ...(normalizedName ? { normalizedName } : {}) },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "COST_CENTER_UPDATED",
          entityType: "CostCenter",
          entityId: id,
          before: auditSnapshot(before),
          after: auditSnapshot(updated),
        },
      });
      return updated;
    });
    return Response.json(after);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("cost-centers:manage");
    const { id } = await context.params;
    await deleteCostCenter(stripCostCenterId(id), session.userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

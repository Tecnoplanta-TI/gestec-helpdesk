import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import {
  deleteManualProject,
  stripManualProjectId,
} from "@/lib/domain/catalog-delete";
import { normalizeProjectName } from "@/lib/domain/projects";
import { manualProjectUpdateSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("time:manage");
    const { id } = await context.params;
    const input = manualProjectUpdateSchema.parse(await readJson(request));
    const before = await prisma.manualProject.findUnique({ where: { id } });
    if (!before)
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Projeto não encontrado.");

    const after = await prisma.$transaction(async (tx) => {
      const normalizedName = input.name
        ? normalizeProjectName(input.name)
        : undefined;
      if (normalizedName) {
        const duplicateCostCenter = await tx.costCenter.findFirst({
          where: {
            OR: [
              { normalizedName },
              { name: { equals: input.name, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        if (duplicateCostCenter)
          throw new ApiError(
            409,
            "PROJECT_NAME_CONFLICT",
            "Já existe um centro de custo com este nome.",
          );
      }
      const updated = await tx.manualProject.update({
        where: { id },
        data: { ...input, ...(normalizedName ? { normalizedName } : {}) },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: updated.active
            ? "MANUAL_PROJECT_UPDATED"
            : "MANUAL_PROJECT_ARCHIVED",
          entityType: "ManualProject",
          entityId: id,
          before: auditSnapshot(before),
          after: auditSnapshot(updated),
        },
      });
      return updated;
    });
    return Response.json({ ...after, id: `manual:${after.id}` });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("time:manage");
    const { id } = await context.params;
    await deleteManualProject(stripManualProjectId(id), session.userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

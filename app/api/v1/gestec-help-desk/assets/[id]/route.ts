import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { deleteAsset } from "@/lib/domain/catalog-delete";
import { assetUpdateSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("assets:manage");
    const { id } = await context.params;
    const input = assetUpdateSchema.parse(await readJson(request));
    const before = await prisma.asset.findUnique({ where: { id } });
    if (!before)
      throw new ApiError(404, "ASSET_NOT_FOUND", "Ativo não encontrado.");

    const after = await prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: {
          ...input,
          ...(input.serialNumber !== undefined
            ? { serialNumber: input.serialNumber || null }
            : {}),
          ...(input.assignedToName !== undefined
            ? { assignedToName: input.assignedToName || null }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "ASSET_UPDATED",
          entityType: "Asset",
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
    const session = await requirePermission("assets:manage");
    const { id } = await context.params;
    await deleteAsset(id, session.userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

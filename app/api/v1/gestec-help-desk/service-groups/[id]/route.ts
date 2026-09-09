import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { deleteServiceGroup } from "@/lib/domain/catalog-delete";
import { serviceGroupUpdateSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("cost-centers:manage");
    const { id } = await context.params;
    const input = serviceGroupUpdateSchema.parse(await readJson(request));
    const group = await prisma.$transaction(async (tx) => {
      const before = await tx.serviceGroup.findUnique({ where: { id } });
      if (!before)
        throw new ApiError(
          404,
          "SERVICE_GROUP_NOT_FOUND",
          "Grupo não encontrado.",
        );
      const updated = await tx.serviceGroup.update({
        where: { id },
        data: input,
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "SERVICE_GROUP_UPDATED",
          entityType: "ServiceGroup",
          entityId: updated.id,
          before: auditSnapshot(before),
          after: auditSnapshot(updated),
        },
      });
      return updated;
    });
    return Response.json(group);
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
    await deleteServiceGroup(id, session.userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

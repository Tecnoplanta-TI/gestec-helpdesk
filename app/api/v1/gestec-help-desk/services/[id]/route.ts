import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { deleteService } from "@/lib/domain/catalog-delete";
import { serviceSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("cost-centers:manage");
    const { id } = await context.params;
    const input = serviceSchema.partial().parse(await readJson(request));
    const service = await prisma.$transaction(async (tx) => {
      const before = await tx.service.findUnique({ where: { id } });
      if (!before)
        throw new ApiError(404, "SERVICE_NOT_FOUND", "Serviço não encontrado.");
      if (input.active === true) {
        const groupId = input.groupId ?? before.groupId;
        const group = await tx.serviceGroup.findFirst({
          where: { id: groupId, active: true },
          select: { id: true },
        });
        if (!group)
          throw new ApiError(
            422,
            "SERVICE_GROUP_UNAVAILABLE",
            "O grupo precisa estar ativo.",
          );
      }
      const updated = await tx.service.update({ where: { id }, data: input });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "SERVICE_UPDATED",
          entityType: "Service",
          entityId: updated.id,
          before: auditSnapshot(before),
          after: auditSnapshot(updated),
        },
      });
      return updated;
    });
    return Response.json(service);
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
    await deleteService(id, session.userId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

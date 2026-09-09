import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { serviceGroupSchema, serviceSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("tickets:view");
    const groups = await prisma.serviceGroup.findMany({
      include: { services: { orderBy: { name: "asc" } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return Response.json(groups);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("cost-centers:manage");
    const body = await readJson(request);
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "groupId" in body
    ) {
      const input = serviceSchema.parse(body);
      const service = await prisma.$transaction(async (tx) => {
        const group = await tx.serviceGroup.findFirst({
          where: { id: input.groupId, active: true },
          select: { id: true },
        });
        if (!group)
          throw new ApiError(
            422,
            "SERVICE_GROUP_UNAVAILABLE",
            "O grupo precisa estar ativo.",
          );
        const created = await tx.service.create({ data: input });
        await tx.auditEvent.create({
          data: {
            actorId: session.userId,
            action: "SERVICE_CREATED",
            entityType: "Service",
            entityId: created.id,
            after: auditSnapshot(created),
          },
        });
        return created;
      });
      return Response.json(service, { status: 201 });
    }
    const input = serviceGroupSchema.parse(body);
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceGroup.create({ data: input });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "SERVICE_GROUP_CREATED",
          entityType: "ServiceGroup",
          entityId: created.id,
          after: auditSnapshot(created),
        },
      });
      return created;
    });
    return Response.json(group, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { normalizeProjectName } from "@/lib/domain/projects";
import { costCenterSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("tickets:view");
    return Response.json(
      await prisma.costCenter.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("cost-centers:manage");
    const input = costCenterSchema.parse(await readJson(request));
    const normalizedName = normalizeProjectName(input.name);
    const costCenter = await prisma.$transaction(async (tx) => {
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
      const created = await tx.costCenter.create({
        data: { ...input, normalizedName },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "COST_CENTER_CREATED",
          entityType: "CostCenter",
          entityId: created.id,
          after: auditSnapshot(created),
        },
      });
      return created;
    });
    return Response.json(costCenter, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { manualProjectSchema } from "@/lib/domain/schemas";
import { listProjects, normalizeProjectName } from "@/lib/domain/projects";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("time:view");
    const query = new URL(request.url).searchParams.get("q") ?? undefined;
    return Response.json(
      await listProjects(query, {
        includePrivateManual: hasPermission(session.role, "time:manage"),
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("time:manage");
    const input = manualProjectSchema.parse(await readJson(request));
    const normalizedName = normalizeProjectName(input.name);
    const project = await prisma.$transaction(async (tx) => {
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
      const created = await tx.manualProject.create({
        data: { ...input, normalizedName },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "MANUAL_PROJECT_CREATED",
          entityType: "ManualProject",
          entityId: created.id,
          after: auditSnapshot(created),
        },
      });
      return created;
    });
    return Response.json(
      { ...project, id: `manual:${project.id}` },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

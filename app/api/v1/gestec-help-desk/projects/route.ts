import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { manualProjectSchema } from "@/lib/domain/schemas";
import { listProjects, normalizeProjectName } from "@/lib/domain/projects";
import { addProjectHourlyRate, centsFromCurrency } from "@/lib/domain/project-rates";
import { errorResponse, readJson } from "@/lib/http/api-error";
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
      const { hourlyRate, hourlyRateEffectiveFrom, ...projectInput } = input;
      const created = await tx.manualProject.create({
        data: { ...projectInput, normalizedName },
      });
      if (hourlyRate !== undefined && hourlyRateEffectiveFrom) {
        await addProjectHourlyRate(tx, {
          manualProjectId: created.id,
          amountCents: centsFromCurrency(hourlyRate),
          effectiveFrom: hourlyRateEffectiveFrom,
          createdById: session.userId,
        });
      }
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

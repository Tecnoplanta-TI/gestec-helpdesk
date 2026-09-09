import { TimeEntryStatus } from "@prisma/client";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { getProject } from "@/lib/domain/projects";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

const updateSchema = z
  .object({
    description: z.string().trim().min(1).max(500).optional(),
    projectId: z
      .string()
      .regex(/^(cost-center|manual):[0-9a-f-]{36}$/i)
      .optional(),
    billable: z.boolean().optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().optional(),
    correctionReason: z.string().trim().min(3).max(1000),
    version: z.number().int().positive(),
  })
  .refine(
    (value) =>
      !value.startedAt || !value.endedAt || value.endedAt > value.startedAt,
    {
      path: ["endedAt"],
      message: "A hora final deve ser posterior à inicial.",
    },
  );

const voidSchema = z.object({
  correctionReason: z.string().trim().min(3).max(1000),
  version: z.number().int().positive(),
});

async function authorize(id: string) {
  const session = await requirePermission("time:write");
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry)
    throw new ApiError(
      404,
      "TIME_ENTRY_NOT_FOUND",
      "Apontamento não encontrado.",
    );
  if (
    entry.userId !== session.userId &&
    !hasPermission(session.role, "time:manage")
  ) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Você não pode alterar apontamentos de outro usuário.",
    );
  }
  return { session, entry };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { session, entry } = await authorize(id);
    if (entry.status === TimeEntryStatus.VOIDED) {
      throw new ApiError(
        409,
        "TIME_ENTRY_VOIDED",
        "Um apontamento invalidado não pode ser editado.",
      );
    }
    const input = updateSchema.parse(await readJson(request));
    const startedAt = input.startedAt ?? entry.startedAt;
    const endedAt = input.endedAt ?? entry.endedAt;
    const durationSeconds = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000,
    );
    if (durationSeconds <= 0 || durationSeconds > 86_400)
      throw new ApiError(
        422,
        "INVALID_DURATION",
        "A duração deve ser maior que zero e de no máximo 24 horas.",
      );
    const updated = await prisma.$transaction(async (tx) => {
      const project = input.projectId
        ? await getProject(input.projectId, session.userId, tx)
        : null;
      const result = await tx.timeEntry.updateMany({
        where: { id, version: input.version },
        data: {
          description: input.description,
          billable: input.billable,
          startedAt,
          endedAt,
          durationSeconds,
          correctionReason: input.correctionReason,
          ...(project
            ? {
                costCenterId:
                  project.kind === "COST_CENTER" ? project.id : null,
                manualProjectId: project.kind === "MANUAL" ? project.id : null,
                projectNameSnapshot: project.name,
                status: TimeEntryStatus.VALID,
              }
            : {}),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "O apontamento foi alterado. Atualize a página.",
        );
      const after = await tx.timeEntry.findUniqueOrThrow({ where: { id } });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "TIME_ENTRY_CORRECTED",
          entityType: "TimeEntry",
          entityId: id,
          before: auditSnapshot(entry),
          after: auditSnapshot(after),
        },
      });
      return after;
    });
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { session, entry } = await authorize(id);
    const input = voidSchema.parse(await readJson(request));
    if (entry.status === TimeEntryStatus.VOIDED) return Response.json(entry);
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.timeEntry.updateMany({
        where: { id, version: input.version },
        data: {
          status: TimeEntryStatus.VOIDED,
          billable: false,
          correctionReason: input.correctionReason,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ApiError(
          409,
          "VERSION_CONFLICT",
          "O apontamento foi alterado. Atualize a página.",
        );
      const after = await tx.timeEntry.findUniqueOrThrow({ where: { id } });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "TIME_ENTRY_VOIDED",
          entityType: "TimeEntry",
          entityId: id,
          before: auditSnapshot(entry),
          after: auditSnapshot(after),
        },
      });
      return after;
    });
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

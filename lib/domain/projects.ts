import type { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export type ProjectReference =
  | {
      kind: "COST_CENTER";
      id: string;
      name: string;
      billableByDefault: boolean;
    }
  | { kind: "MANUAL"; id: string; name: string; billableByDefault: boolean };

export function normalizeProjectName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function parseProjectId(projectId: string) {
  const [kind, id] = projectId.split(":");
  if (!id || (kind !== "cost-center" && kind !== "manual")) {
    throw new ApiError(422, "INVALID_PROJECT", "Selecione um projeto válido.");
  }
  return { kind, id };
}

type ProjectClient = Pick<
  Prisma.TransactionClient,
  "costCenter" | "manualProject" | "userRef"
>;

export async function getProject(
  projectId: string,
  userId: string,
  client: ProjectClient = prisma,
): Promise<ProjectReference> {
  const project = parseProjectId(projectId);

  if (project.kind === "cost-center") {
    const costCenter = await client.costCenter.findFirst({
      where: { id: project.id, active: true },
    });
    if (!costCenter) {
      throw new ApiError(
        422,
        "PROJECT_UNAVAILABLE",
        "Este projeto não está disponível para novos apontamentos.",
      );
    }
    return {
      kind: "COST_CENTER",
      id: costCenter.id,
      name: costCenter.name,
      billableByDefault: true,
    };
  }

  const manual = await client.manualProject.findFirst({
    where: { id: project.id, active: true },
  });
  if (!manual) {
    throw new ApiError(
      422,
      "PROJECT_UNAVAILABLE",
      "Este projeto não está disponível para novos apontamentos.",
    );
  }
  if (!manual.availableToAll) {
    const user = await client.userRef.findUnique({
      where: { id: userId },
      select: { role: true, active: true },
    });
    if (!user?.active || !hasPermission(user.role, "time:manage")) {
      throw new ApiError(
        403,
        "PROJECT_FORBIDDEN",
        "Você não possui acesso a este projeto.",
      );
    }
  }
  return {
    kind: "MANUAL",
    id: manual.id,
    name: manual.name,
    billableByDefault: manual.billableByDefault,
  };
}

export async function getProjectAny(
  projectId: string,
  client: ProjectClient = prisma,
): Promise<ProjectReference> {
  const project = parseProjectId(projectId);

  if (project.kind === "cost-center") {
    const costCenter = await client.costCenter.findUnique({
      where: { id: project.id },
    });
    if (!costCenter) {
      throw new ApiError(
        422,
        "PROJECT_UNAVAILABLE",
        "Este projeto não está disponível.",
      );
    }
    return {
      kind: "COST_CENTER",
      id: costCenter.id,
      name: costCenter.name,
      billableByDefault: true,
    };
  }

  const manual = await client.manualProject.findUnique({
    where: { id: project.id },
  });
  if (!manual) {
    throw new ApiError(
      422,
      "PROJECT_UNAVAILABLE",
      "Este projeto não está disponível.",
    );
  }
  return {
    kind: "MANUAL",
    id: manual.id,
    name: manual.name,
    billableByDefault: manual.billableByDefault,
  };
}

export async function listProjects(
  query?: string,
  options?: { includePrivateManual?: boolean },
) {
  const search = query?.trim();
  const [costCenters, manualProjects] = await Promise.all([
    prisma.costCenter.findMany({
      where: {
        active: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { code: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.manualProject.findMany({
      where: {
        active: true,
        ...(options?.includePrivateManual ? {} : { availableToAll: true }),
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      select: { id: true, name: true, billableByDefault: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return [
    ...costCenters.map((project) => ({
      id: `cost-center:${project.id}`,
      name: project.name,
      code: project.code,
      billableByDefault: true,
    })),
    ...manualProjects.map((project) => ({
      id: `manual:${project.id}`,
      name: project.name,
      code: null,
      billableByDefault: project.billableByDefault,
    })),
  ];
}

export async function listProjectCatalog(options?: {
  includePrivateManual?: boolean;
  includeInactive?: boolean;
  monthFrom?: Date;
  monthTo?: Date;
}) {
  const activeWhere = options?.includeInactive ? {} : { active: true };
  const [costCenters, manualProjects, monthEntries] = await Promise.all([
    prisma.costCenter.findMany({
      where: activeWhere,
      select: {
        id: true,
        name: true,
        code: true,
        active: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.manualProject.findMany({
      where: {
        ...activeWhere,
        ...(options?.includePrivateManual ? {} : { availableToAll: true }),
      },
      select: {
        id: true,
        name: true,
        color: true,
        availableToAll: true,
        active: true,
        billableByDefault: true,
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    options?.monthFrom && options.monthTo
      ? prisma.timeEntry.groupBy({
          by: ["costCenterId", "manualProjectId"],
          where: {
            status: { not: "VOIDED" },
            startedAt: { gte: options.monthFrom, lt: options.monthTo },
          },
          _sum: { durationSeconds: true },
        })
      : Promise.resolve([]),
  ]);

  const monthSeconds = new Map<string, number>();
  for (const row of monthEntries) {
    const id = row.costCenterId
      ? `cost-center:${row.costCenterId}`
      : row.manualProjectId
        ? `manual:${row.manualProjectId}`
        : "";
    if (id) monthSeconds.set(id, row._sum.durationSeconds ?? 0);
  }

  return [
    ...costCenters.map((project) => {
      const id = `cost-center:${project.id}`;
      return {
        id,
        kind: "cost-center" as const,
        name: project.name,
        code: project.code,
        color: null as string | null,
        availableToAll: true,
        active: project.active,
        billableByDefault: true,
        monthSeconds: monthSeconds.get(id) ?? 0,
      };
    }),
    ...manualProjects.map((project) => {
      const id = `manual:${project.id}`;
      return {
        id,
        kind: "manual" as const,
        name: project.name,
        code: null as string | null,
        color: project.color,
        availableToAll: project.availableToAll,
        active: project.active,
        billableByDefault: project.billableByDefault,
        monthSeconds: monthSeconds.get(id) ?? 0,
      };
    }),
  ].sort((left, right) => right.monthSeconds - left.monthSeconds);
}

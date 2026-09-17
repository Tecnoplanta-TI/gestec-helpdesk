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

function compareCostCenterCode(left: string, right: string) {
  const leftCode = Number(left);
  const rightCode = Number(right);
  if (
    Number.isFinite(leftCode) &&
    Number.isFinite(rightCode) &&
    leftCode !== rightCode
  ) {
    return leftCode - rightCode;
  }
  return left.localeCompare(right, "pt-BR", { numeric: true });
}

export async function listProjects(
  query?: string,
  options?: { includePrivateManual?: boolean },
) {
  const search = query?.trim();
  const nameOrCode = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [costCenters, manualProjects] = await Promise.all([
    prisma.costCenter.findMany({
      where: { active: true, ...nameOrCode },
      select: { id: true, name: true, code: true },
    }),
    prisma.manualProject.findMany({
      where: {
        active: true,
        ...(options?.includePrivateManual ? {} : { availableToAll: true }),
        ...nameOrCode,
      },
      select: { id: true, name: true, code: true, billableByDefault: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const centers = costCenters
    .map((costCenter) => ({
      id: `cost-center:${costCenter.id}`,
      kind: "cost-center" as const,
      name: costCenter.name,
      code: costCenter.code,
      billableByDefault: true,
    }))
    .sort((left, right) => compareCostCenterCode(left.code, right.code));

  const manuals = manualProjects.map((project) => ({
    id: `manual:${project.id}`,
    kind: "manual" as const,
    name: project.name,
    code: project.code,
    billableByDefault: project.billableByDefault,
  }));

  return [...centers, ...manuals];
}

export async function listProjectCatalog(options?: {
  includePrivateManual?: boolean;
  includeInactive?: boolean;
  monthFrom?: Date;
  monthTo?: Date;
}) {
  const activeWhere = options?.includeInactive ? {} : { active: true };
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const [manualProjects, monthEntries] = await Promise.all([
    prisma.manualProject.findMany({
      where: {
        ...activeWhere,
        ...(options?.includePrivateManual ? {} : { availableToAll: true }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        color: true,
        availableToAll: true,
        active: true,
        billableByDefault: true,
        hourlyRates: {
          orderBy: { effectiveFrom: "desc" },
          select: { amountCents: true, effectiveFrom: true },
        },
        costCenterShares: {
          orderBy: { shareBps: "desc" },
          select: {
            shareBps: true,
            costCenterId: true,
            costCenter: { select: { code: true, name: true } },
          },
        },
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

  return manualProjects
    .map((project) => {
      const id = `manual:${project.id}`;
      const currentRate = project.hourlyRates.find(
        (rate) => rate.effectiveFrom <= today,
      );
      const latestRate = project.hourlyRates[0];
      return {
        id,
        kind: "manual" as const,
        name: project.name,
        code: project.code,
        color: project.color,
        availableToAll: project.availableToAll,
        active: project.active,
        billableByDefault: project.billableByDefault,
        hourlyRateCents: currentRate?.amountCents ?? null,
        hourlyRateEffectiveFrom: currentRate?.effectiveFrom ?? null,
        latestHourlyRateEffectiveFrom: latestRate?.effectiveFrom ?? null,
        monthSeconds: monthSeconds.get(id) ?? 0,
        rateio: project.costCenterShares.map((share) => ({
          costCenterId: share.costCenterId,
          code: share.costCenter.code,
          name: share.costCenter.name,
          shareBps: share.shareBps,
        })),
      };
    })
    .sort((left, right) => right.monthSeconds - left.monthSeconds);
}

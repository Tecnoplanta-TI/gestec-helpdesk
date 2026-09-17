import type { Prisma } from "@prisma/client";

import { RATEIO_TOTAL_BPS } from "@/lib/format";
import { ApiError } from "@/lib/http/api-error";

export type RateioAllocationInput = {
  costCenterId: string;
  percent: number;
};

export type RateioShare = {
  costCenterId: string;
  shareBps: number;
};

type RateioClient = Pick<
  Prisma.TransactionClient,
  "costCenter" | "projectCostCenterShare"
>;

export function allocationsToShares(
  allocations: RateioAllocationInput[],
): RateioShare[] {
  const ids = new Set<string>();
  const shares: RateioShare[] = [];
  for (const allocation of allocations) {
    if (ids.has(allocation.costCenterId)) {
      throw new ApiError(
        422,
        "INVALID_RATEIO",
        "Não repita o mesmo centro de custo no rateio.",
      );
    }
    ids.add(allocation.costCenterId);
    const shareBps = Math.round(allocation.percent * 100);
    if (
      !Number.isFinite(shareBps) ||
      shareBps <= 0 ||
      shareBps > RATEIO_TOTAL_BPS
    ) {
      throw new ApiError(
        422,
        "INVALID_RATEIO",
        "Informe percentuais de rateio entre 0 e 100.",
      );
    }
    shares.push({ costCenterId: allocation.costCenterId, shareBps });
  }
  if (!shares.length) return [];
  const total = shares.reduce((sum, share) => sum + share.shareBps, 0);
  if (total !== RATEIO_TOTAL_BPS) {
    throw new ApiError(
      422,
      "INVALID_RATEIO",
      "A soma do rateio deve ser 100%.",
    );
  }
  return shares;
}

export function allocateSeconds<T extends RateioShare>(
  totalSeconds: number,
  shares: T[],
) {
  if (!shares.length) {
    return [] as Array<T & { seconds: number }>;
  }
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const ordered = [...shares].sort((left, right) => {
    if (right.shareBps !== left.shareBps) return right.shareBps - left.shareBps;
    return left.costCenterId.localeCompare(right.costCenterId);
  });
  let used = 0;
  return ordered.map((share, index) => {
    const allocated =
      index === ordered.length - 1
        ? seconds - used
        : Math.round((seconds * share.shareBps) / RATEIO_TOTAL_BPS);
    used += allocated;
    return { ...share, seconds: allocated };
  });
}

export async function nextManualProjectCode(client: {
  manualProject: {
    findMany: (args: {
      select: { code: true };
    }) => Promise<Array<{ code: string }>>;
  };
}) {
  const projects = await client.manualProject.findMany({
    select: { code: true },
  });
  let max = 0;
  for (const project of projects) {
    const match = /^PRO-(\d+)$/i.exec(project.code);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > max) max = value;
  }
  return `PRO-${String(max + 1).padStart(4, "0")}`;
}

export async function replaceProjectRateio(
  client: RateioClient,
  manualProjectId: string,
  allocations: RateioAllocationInput[],
) {
  const shares = allocationsToShares(allocations);
  if (shares.length) {
    const centers = await client.costCenter.findMany({
      where: { id: { in: shares.map((share) => share.costCenterId) } },
      select: { id: true, active: true },
    });
    if (centers.length !== shares.length) {
      throw new ApiError(
        422,
        "INVALID_RATEIO",
        "Selecione centros de custo válidos para o rateio.",
      );
    }
    if (centers.some((center) => !center.active)) {
      throw new ApiError(
        422,
        "INVALID_RATEIO",
        "Não é possível ratear para um centro de custo inativo.",
      );
    }
  }

  await client.projectCostCenterShare.deleteMany({
    where: { manualProjectId },
  });
  if (!shares.length) return [];
  await client.projectCostCenterShare.createMany({
    data: shares.map((share) => ({
      manualProjectId,
      costCenterId: share.costCenterId,
      shareBps: share.shareBps,
    })),
  });
  return shares;
}

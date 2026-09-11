import type { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";

type RateClient = Pick<Prisma.TransactionClient, "projectHourlyRate">;

export function dateOnlyToUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function centsFromCurrency(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
    throw new ApiError(422, "INVALID_HOURLY_RATE", "Informe um valor-hora válido.");
  }
  return Math.round(value * 100);
}

export async function addProjectHourlyRate(
  client: RateClient,
  input: { manualProjectId: string; amountCents: number; effectiveFrom: string; createdById: string },
) {
  const effectiveFrom = dateOnlyToUtc(input.effectiveFrom);
  const latest = await client.projectHourlyRate.findFirst({
    where: { manualProjectId: input.manualProjectId },
    orderBy: { effectiveFrom: "desc" },
    select: { effectiveFrom: true },
  });

  if (latest && effectiveFrom <= latest.effectiveFrom) {
    throw new ApiError(
      409,
      "HOURLY_RATE_EFFECTIVE_DATE_CONFLICT",
      "A vigência deve ser posterior à última alteração de valor-hora deste projeto.",
    );
  }

  return client.projectHourlyRate.create({
    data: { ...input, effectiveFrom },
  });
}

export async function findProjectHourlyRateCents(
  client: Pick<Prisma.TransactionClient, "projectHourlyRate">,
  manualProjectId: string,
  at: Date,
) {
  const rate = await client.projectHourlyRate.findFirst({
    where: { manualProjectId, effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: "desc" },
    select: { amountCents: true },
  });
  return rate?.amountCents ?? null;
}

import { Prisma, TimeEntryStatus } from "@prisma/client";

import { ApiError } from "@/lib/http/api-error";

const PROJECT_ID = /^(cost-center|manual):([0-9a-f-]{36})$/i;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDate(value: string | null, fallback: Date, endOfDate = false) {
  if (!value) return fallback;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(
    dateOnly ? `${value}T${endOfDate ? "23:59:59.999" : "00:00:00"}` : value,
  );
  if (Number.isNaN(parsed.getTime()))
    throw new ApiError(422, "INVALID_PERIOD", "Informe um período válido.");
  return parsed;
}

export function reportFilters(searchParams: URLSearchParams, now = new Date()) {
  const from = parseDate(
    searchParams.get("from"),
    new Date(now.getTime() - 30 * 86_400_000),
  );
  const to = parseDate(searchParams.get("to"), now, true);
  if (from > to)
    throw new ApiError(
      422,
      "INVALID_PERIOD",
      "A data inicial deve ser anterior à data final.",
    );

  const projectValue = searchParams.get("project")?.trim() ?? "";
  const project = PROJECT_ID.exec(projectValue);
  if (projectValue && !project) {
    throw new ApiError(
      422,
      "INVALID_PROJECT",
      "O projeto ou centro de custo informado não é válido.",
    );
  }
  const projectKind = project?.[1]?.toLowerCase();
  const explicitCostCenter = searchParams.get("costCenter")?.trim() ?? "";
  const explicitManualProject = searchParams.get("manualProject")?.trim() ?? "";
  if (explicitCostCenter && !UUID.test(explicitCostCenter)) {
    throw new ApiError(
      422,
      "INVALID_COST_CENTER",
      "O centro de custo informado não é válido.",
    );
  }
  if (explicitManualProject && !UUID.test(explicitManualProject)) {
    throw new ApiError(
      422,
      "INVALID_PROJECT",
      "O projeto informado não é válido.",
    );
  }
  const billableValue = searchParams.get("billable");
  const ticket = searchParams.get("ticket")?.trim();
  const ticketNumber = ticket ? Number(ticket.replace("#", "")) : NaN;
  const searchByTicketNumber =
    Number.isInteger(ticketNumber) && ticketNumber > 0;
  const userId = searchParams.get("userId")?.trim();
  if (userId && !UUID.test(userId))
    throw new ApiError(
      422,
      "INVALID_USER",
      "O usuário informado não é válido.",
    );

  const where: Prisma.TimeEntryWhereInput = {
    status: { not: TimeEntryStatus.VOIDED },
    startedAt: { gte: from, lte: to },
    ...(explicitCostCenter || projectKind === "cost-center"
      ? { costCenterId: explicitCostCenter || project?.[2] }
      : {}),
    ...(explicitManualProject || projectKind === "manual"
      ? { manualProjectId: explicitManualProject || project?.[2] }
      : {}),
    ...(billableValue === "billable" ? { billable: true } : {}),
    ...(billableValue === "non-billable" ? { billable: false } : {}),
    ...(userId ? { userId } : {}),
    ...(ticket
      ? {
          OR: [
            { description: { contains: ticket, mode: "insensitive" } },
            {
              ticket: {
                externalReference: { contains: ticket, mode: "insensitive" },
              },
            },
            ...(searchByTicketNumber
              ? [
                  { ticket: { number: ticketNumber } },
                  { ticketNumberSnapshot: ticketNumber },
                ]
              : []),
          ],
        }
      : {}),
  };

  return { from, to, where };
}

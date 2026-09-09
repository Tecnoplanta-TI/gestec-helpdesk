import { Prisma, TicketPriority, TicketStatus } from "@prisma/client";

import {
  normalizeRequestType,
  type KanbanType,
} from "@/lib/domain/request-types";

export function parseTicketFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status =
    typeof params.status === "string" &&
    Object.values(TicketStatus).includes(params.status as TicketStatus)
      ? (params.status as TicketStatus)
      : undefined;
  const priority =
    typeof params.priority === "string" &&
    Object.values(TicketPriority).includes(params.priority as TicketPriority)
      ? (params.priority as TicketPriority)
      : undefined;
  const requestType =
    typeof params.type === "string" &&
    ["solicitacao", "incidente", "melhoria", "interrupcao_servico"].includes(
      params.type,
    )
      ? (params.type as KanbanType)
      : undefined;
  const requestedPage = Number(
    typeof params.page === "string" ? params.page : 1,
  );
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const pageSize = 20;
  return { query, status, priority, requestType, page, pageSize };
}

export function ticketSearchWhere(
  input: ReturnType<typeof parseTicketFilters>,
): Prisma.TicketWhereInput {
  const numberQuery = Number(input.query.replace("#", "").trim());
  const searchByNumber =
    input.query.length > 0 && Number.isInteger(numberQuery) && numberQuery > 0;
  const search: Prisma.TicketWhereInput[] = input.query
    ? [
        { title: { contains: input.query, mode: "insensitive" } },
        { externalReference: { contains: input.query, mode: "insensitive" } },
        { requesterName: { contains: input.query, mode: "insensitive" } },
        ...(searchByNumber ? [{ number: numberQuery }] : []),
      ]
    : [];

  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.requestType ? { requestType: input.requestType } : {}),
    ...(search.length > 0 ? { OR: search } : {}),
  };
}

export { normalizeRequestType };

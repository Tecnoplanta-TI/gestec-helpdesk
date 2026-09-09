import { requirePermission } from "@/lib/auth/session";
import {
  parseTicketFilters,
  ticketSearchWhere,
} from "@/lib/domain/ticket-query";
import { errorResponse } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requirePermission("tickets:view");
    const { searchParams } = new URL(request.url);
    const filters = parseTicketFilters(
      Object.fromEntries(searchParams.entries()),
    );
    const requestedPageSize = Number(
      searchParams.get("pageSize") ?? filters.pageSize,
    );
    const pageSize = Number.isSafeInteger(requestedPageSize)
      ? Math.min(100, Math.max(1, requestedPageSize))
      : filters.pageSize;
    const where = ticketSearchWhere(filters);
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          costCenter: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ priority: "desc" }, { openedAt: "desc" }],
        skip: (filters.page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);
    return Response.json({
      items,
      page: filters.page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

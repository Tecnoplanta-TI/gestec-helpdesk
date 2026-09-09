import { requirePermission } from "@/lib/auth/session";
import { manualTimeEntrySchema } from "@/lib/domain/schemas";
import { createManualTimeEntry } from "@/lib/domain/time";
import {
  operationalTimeWhere,
  parseTimeFilters,
  timeRangeWhere,
} from "@/lib/domain/time-query";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await requirePermission("time:view");
    const { searchParams } = new URL(request.url);
    const filters = parseTimeFilters(
      Object.fromEntries(searchParams.entries()),
    );
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");
    const from =
      customTo && customFrom ? new Date(customFrom) : filters.weekStart;
    const to = customTo ? new Date(customTo) : filters.weekEnd;
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from >= to
    ) {
      throw new ApiError(
        422,
        "INVALID_PERIOD",
        "Informe um período válido, com o início anterior ao fim.",
      );
    }
    const entries = await prisma.timeEntry.findMany({
      where: {
        ...operationalTimeWhere(session.userId, filters),
        ...timeRangeWhere(from, to),
      },
      include: {
        ticket: { select: { id: true, number: true, externalReference: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    return Response.json(entries);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("time:write");
    const input = manualTimeEntrySchema.parse(await readJson(request));
    const entry = await createManualTimeEntry({
      userId: session.userId,
      ...input,
    });
    return Response.json(entry, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

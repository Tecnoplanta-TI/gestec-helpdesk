import { requirePermission } from "@/lib/auth/session";
import {
  timerStartSchema,
  timerStopSchema,
  timerUpdateSchema,
} from "@/lib/domain/schemas";
import { startTimer, stopTimer, updateActiveTimer } from "@/lib/domain/time";
import { errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requirePermission("time:view");
    return Response.json(
      await prisma.activeTimer.findUnique({
        where: { userId: session.userId },
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("time:write");
    const input = timerStartSchema.parse(await readJson(request));
    return Response.json(
      await startTimer({ userId: session.userId, ...input }),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("time:write");
    const input = timerUpdateSchema.parse(await readJson(request));
    return Response.json(await updateActiveTimer(session.userId, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requirePermission("time:write");
    const input = timerStopSchema.parse(await readJson(request));
    return Response.json(await stopTimer(session.userId, input));
  } catch (error) {
    return errorResponse(error);
  }
}

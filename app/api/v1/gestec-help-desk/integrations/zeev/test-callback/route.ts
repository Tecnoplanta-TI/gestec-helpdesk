import { Prisma, SyncDirection, SyncStatus } from "@prisma/client";

import { assertBearerToken } from "@/lib/domain/integrations";
import { errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    assertBearerToken(request, process.env.ZEEV_CALLBACK_TOKEN);
    const items = await prisma.syncExecution.findMany({
      where: { direction: SyncDirection.OUTBOUND },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        ticket: {
          select: { number: true, externalReference: true, title: true },
        },
      },
    });
    return Response.json(items);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertBearerToken(request, process.env.ZEEV_CALLBACK_TOKEN);
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey) {
      return Response.json(
        {
          error: {
            code: "IDEMPOTENCY_REQUIRED",
            message: "Cabeçalho Idempotency-Key obrigatório.",
          },
        },
        { status: 400 },
      );
    }
    const payload = await readJson(request);
    const externalReference =
      payload &&
      typeof payload === "object" &&
      "payload" in payload &&
      payload.payload &&
      typeof payload.payload === "object" &&
      payload.payload !== null &&
      "externalReference" in payload.payload
        ? String(
            (payload.payload as { externalReference?: string })
              .externalReference ?? "",
          )
        : "";
    const ticket = externalReference
      ? await prisma.ticket.findUnique({
          where: { externalReference },
          select: { id: true },
        })
      : null;
    await prisma.syncExecution.upsert({
      where: { idempotencyKey: `simulator-ack:${idempotencyKey}` },
      create: {
        ticketId: ticket?.id,
        idempotencyKey: `simulator-ack:${idempotencyKey}`,
        event: "zeev.simulator.ack",
        direction: SyncDirection.INBOUND,
        status: SyncStatus.SUCCEEDED,
        payload: payload as Prisma.InputJsonValue,
        response: { accepted: true, simulator: true } as Prisma.InputJsonValue,
        attempts: 1,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
        response: { accepted: true, replay: true } as Prisma.InputJsonValue,
      },
    });
    return Response.json({ accepted: true, idempotencyKey, simulator: true });
  } catch (error) {
    return errorResponse(error);
  }
}

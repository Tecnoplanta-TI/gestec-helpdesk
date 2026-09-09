import { requirePermission } from "@/lib/auth/session";
import { queueZeevSync } from "@/lib/domain/tickets";
import { commentSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";
import { SyncDirection, SyncStatus } from "@prisma/client";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = commentSchema.parse(await readJson(request));
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        select: { externalReference: true, externalInstanceId: true },
      });
      if (!ticket)
        throw new ApiError(404, "TICKET_NOT_FOUND", "Ticket não encontrado.");

      const replay = await tx.ticketComment.findUnique({
        where: { requestKey: input.requestKey },
        include: { author: { select: { id: true, name: true } } },
      });
      if (replay) {
        if (
          replay.ticketId !== id ||
          replay.authorId !== session.userId ||
          replay.body !== input.body ||
          replay.internal !== input.internal
        ) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Esta chave já foi usada em outro comentário.",
          );
        }
        return {
          comment: replay,
          syncKey: replay.internal
            ? null
            : `zeev:${ticket.externalReference}:comment:${replay.id}`,
          replay: true,
        };
      }

      const comment = await tx.ticketComment.create({
        data: { ticketId: id, authorId: session.userId, ...input },
        include: { author: { select: { id: true, name: true } } },
      });
      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: input.internal ? "INTERNAL_COMMENT_ADDED" : "COMMENT_ADDED",
          actorId: session.userId,
        },
      });
      const syncKey = input.internal
        ? null
        : `zeev:${ticket.externalReference}:comment:${comment.id}`;
      if (syncKey) {
        await tx.syncExecution.create({
          data: {
            ticketId: id,
            idempotencyKey: syncKey,
            event: "ticket.comment_added",
            direction: SyncDirection.OUTBOUND,
            status: SyncStatus.PENDING,
            payload: {
              externalReference: ticket.externalReference,
              instanceId: ticket.externalInstanceId,
              commentId: comment.id,
              author: comment.author.name,
              body: comment.body,
            },
          },
        });
      }
      return { comment, syncKey, replay: false };
    });
    if (result.syncKey) await queueZeevSync(result.syncKey);
    return Response.json(result.comment, { status: result.replay ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

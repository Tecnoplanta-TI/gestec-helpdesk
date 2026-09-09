import { requirePermission } from "@/lib/auth/session";
import { linkTicketAsset } from "@/lib/domain/operations";
import { ticketAssetSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("tickets:work");
    const { id } = await context.params;
    const input = ticketAssetSchema.parse(await readJson(request));
    const link = await linkTicketAsset({
      ticketId: id,
      assetId: input.assetId,
      actorId: session.userId,
      relationType: input.relationType,
    });
    return Response.json(link, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

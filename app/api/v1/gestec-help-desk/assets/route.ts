import { requirePermission } from "@/lib/auth/session";
import { auditSnapshot } from "@/lib/domain/audit";
import { assetSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requirePermission("assets:view");
    const query = new URL(request.url).searchParams.get("q")?.trim();
    return Response.json(
      await prisma.asset.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { assetTag: { contains: query, mode: "insensitive" } },
                { serialNumber: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { name: "asc" },
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("assets:manage");
    const input = assetSchema.parse(await readJson(request));
    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: {
          ...input,
          serialNumber: input.serialNumber || null,
          assignedToName: input.assignedToName || null,
          notes: input.notes || null,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: session.userId,
          action: "ASSET_CREATED",
          entityType: "Asset",
          entityId: created.id,
          after: auditSnapshot(created),
        },
      });
      return created;
    });
    return Response.json(asset, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

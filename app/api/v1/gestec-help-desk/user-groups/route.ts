import { requirePermission } from "@/lib/auth/session";
import { normalizeProjectName } from "@/lib/domain/projects";
import { userGroupSchema } from "@/lib/domain/schemas";
import { ApiError, errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("admin:manage");
    return Response.json(
      await prisma.userGroup.findMany({
        include: {
          manager: { select: { id: true, name: true } },
          members: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { name: "asc" },
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("admin:manage");
    const input = userGroupSchema.parse(await readJson(request));
    const created = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.userGroup.findUnique({
        where: { normalizedName: normalizeProjectName(input.name) },
      });
      if (duplicate)
        throw new ApiError(
          409,
          "GROUP_NAME_CONFLICT",
          "Já existe um grupo com este nome.",
        );
      return tx.userGroup.create({
        data: {
          name: input.name,
          normalizedName: normalizeProjectName(input.name),
          managerId: input.managerId ?? null,
          active: input.active,
          members: {
            create: [...new Set(input.memberIds)].map((userId) => ({ userId })),
          },
        },
        include: {
          manager: { select: { id: true, name: true } },
          members: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

import { requirePermission } from "@/lib/auth/session";
import { createAdminUser } from "@/lib/domain/admin";
import { adminUserSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission("admin:manage");
    const users = await prisma.userRef.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return Response.json(users);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("admin:manage");
    const data = adminUserSchema.parse(await readJson(request));
    const user = await createAdminUser({ actorId: session.userId, data });
    return Response.json(user, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

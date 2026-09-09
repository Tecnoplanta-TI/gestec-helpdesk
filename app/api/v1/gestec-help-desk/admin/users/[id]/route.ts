import { requirePermission } from "@/lib/auth/session";
import { updateAdminUser } from "@/lib/domain/admin";
import { adminUserUpdateSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("admin:manage");
    const { id } = await context.params;
    const data = adminUserUpdateSchema.parse(await readJson(request));
    const user = await updateAdminUser({
      id,
      actorId: session.userId,
      data,
    });
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}

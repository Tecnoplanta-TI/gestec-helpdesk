import { requirePermission } from "@/lib/auth/session";
import { updateAdminTimeEntry } from "@/lib/domain/admin";
import { adminTimeEntryUpdateSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("admin:manage");
    const { id } = await context.params;
    const data = adminTimeEntryUpdateSchema.parse(await readJson(request));
    const entry = await updateAdminTimeEntry({
      id,
      actorId: session.userId,
      data,
    });
    return Response.json(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

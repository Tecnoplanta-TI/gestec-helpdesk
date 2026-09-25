import { requirePermission } from "@/lib/auth/session";
import { duplicateAdminTimeEntry } from "@/lib/domain/admin";
import { adminTimeEntryDuplicateSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("admin:manage");
    const { id } = await context.params;
    const data = adminTimeEntryDuplicateSchema.parse(await readJson(request));
    const entry = await duplicateAdminTimeEntry({
      id,
      actorId: session.userId,
      data,
    });
    return Response.json(entry, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

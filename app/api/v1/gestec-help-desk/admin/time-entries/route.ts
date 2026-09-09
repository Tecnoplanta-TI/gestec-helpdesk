import { requirePermission } from "@/lib/auth/session";
import { createAdminTimeEntry } from "@/lib/domain/admin";
import { adminTimeEntryCreateSchema } from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function POST(request: Request) {
  try {
    const session = await requirePermission("admin:manage");
    const data = adminTimeEntryCreateSchema.parse(await readJson(request));
    const entry = await createAdminTimeEntry({
      actorId: session.userId,
      data,
    });
    return Response.json(entry, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

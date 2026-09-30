import { requirePermission } from "@/lib/auth/session";
import {
  deleteAdminTimeEntriesBulk,
  updateAdminTimeEntriesBulk,
} from "@/lib/domain/admin";
import {
  adminTimeEntryBulkDeleteSchema,
  adminTimeEntryBulkUpdateSchema,
} from "@/lib/domain/schemas";
import { errorResponse, readJson } from "@/lib/http/api-error";

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("admin:manage");
    const data = adminTimeEntryBulkUpdateSchema.parse(await readJson(request));
    const result = await updateAdminTimeEntriesBulk({
      actorId: session.userId,
      data,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requirePermission("admin:manage");
    const data = adminTimeEntryBulkDeleteSchema.parse(await readJson(request));
    const result = await deleteAdminTimeEntriesBulk({
      actorId: session.userId,
      data,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

import { requirePermission } from "@/lib/auth/session";
import { listAssignableUsers } from "@/lib/domain/users";
import { errorResponse } from "@/lib/http/api-error";

export async function GET() {
  try {
    await requirePermission("tickets:view");
    return Response.json(await listAssignableUsers());
  } catch (error) {
    return errorResponse(error);
  }
}

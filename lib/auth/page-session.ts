import "server-only";

import { redirect } from "next/navigation";

import { ApiError } from "@/lib/http/api-error";
import { requirePermission } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";

export async function requirePagePermission(permission: Permission) {
  try {
    return await requirePermission(permission);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      redirect("/gestec_help_desk/tickets");
    }
    throw error;
  }
}

import type { UserRole } from "@prisma/client";

export type Permission =
  | "tickets:view"
  | "tickets:work"
  | "tickets:manage"
  | "time:view"
  | "time:write"
  | "time:manage"
  | "cost-centers:manage"
  | "assets:view"
  | "assets:manage"
  | "reports:view"
  | "reports:export"
  | "admin:manage";

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    "tickets:view",
    "tickets:work",
    "tickets:manage",
    "time:view",
    "time:write",
    "time:manage",
    "cost-centers:manage",
    "assets:view",
    "assets:manage",
    "reports:view",
    "reports:export",
    "admin:manage",
  ]),
  MANAGER: new Set<Permission>([
    "tickets:view",
    "tickets:work",
    "tickets:manage",
    "time:view",
    "time:write",
    "time:manage",
    "assets:view",
    "reports:view",
    "reports:export",
  ]),
  TECHNICIAN: new Set<Permission>([
    "tickets:view",
    "tickets:work",
    "time:view",
    "time:write",
    "assets:view",
  ]),
  AUDITOR: new Set<Permission>([
    "tickets:view",
    "time:view",
    "assets:view",
    "reports:view",
    "reports:export",
  ]),
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].has(permission);
}

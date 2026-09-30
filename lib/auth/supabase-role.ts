import { UserRole } from "@prisma/client";

export function resolveSupabaseRole(input: {
  email: string;
  persistedRole?: UserRole | null;
  initialAdministrators: ReadonlySet<string>;
}): UserRole | null {
  if (input.persistedRole) return input.persistedRole;
  return null;
}

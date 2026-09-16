import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";

import { hasPermission } from "@/lib/auth/permissions";

describe("permissões de relatórios", () => {
  it("permite que todo perfil autenticado veja relatórios e exporte Excel", () => {
    for (const role of Object.values(UserRole)) {
      expect(hasPermission(role, "reports:view")).toBe(true);
      expect(hasPermission(role, "reports:export")).toBe(true);
    }
  });
});

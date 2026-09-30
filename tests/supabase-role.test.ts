import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";

import { resolveSupabaseRole } from "@/lib/auth/supabase-role";

describe("papel local para usuários Supabase", () => {
  const initialAdministrators = new Set(["admin@gestec.io"]);

  it("preserva o papel ADMIN concedido pelo painel, fora da allowlist", () => {
    expect(
      resolveSupabaseRole({
        email: "gabriel@gestec.io",
        persistedRole: UserRole.ADMIN,
        initialAdministrators,
      }),
    ).toBe(UserRole.ADMIN);
  });

  it("mantém alterações feitas no painel mesmo para contas da allowlist", () => {
    expect(
      resolveSupabaseRole({
        email: "ADMIN@GESTEC.IO",
        persistedRole: UserRole.TECHNICIAN,
        initialAdministrators,
      }),
    ).toBe(UserRole.TECHNICIAN);
  });

  it("não concede papel sem um perfil local já cadastrado", () => {
    expect(
      resolveSupabaseRole({
        email: "ADMIN@GESTEC.IO",
        initialAdministrators,
      }),
    ).toBeNull();
    expect(
      resolveSupabaseRole({
        email: "new.user@gestec.io",
        initialAdministrators,
      }),
    ).toBeNull();
  });
});

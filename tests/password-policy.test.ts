import { describe, expect, it } from "vitest";

import { newPasswordValidationError } from "@/lib/auth/password-policy";

describe("política de nova senha", () => {
  it("exige no mínimo oito caracteres", () => {
    expect(newPasswordValidationError("1234567", "1234567")).toContain("8");
  });

  it("exige confirmação idêntica", () => {
    expect(newPasswordValidationError("senhaforte", "outra-senha")).toContain(
      "não coincidem",
    );
  });

  it("aceita uma senha válida e confirmada", () => {
    expect(newPasswordValidationError("senhaforte", "senhaforte")).toBeNull();
  });
});

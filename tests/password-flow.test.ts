import { describe, expect, it } from "vitest";

import {
  passwordFlowDestination,
  passwordFlowFromTokenType,
} from "@/lib/auth/password-flow";

describe("fluxos de senha", () => {
  it("direciona convites para a criação inicial de senha", () => {
    expect(passwordFlowFromTokenType("invite")).toBe("invite");
    expect(passwordFlowDestination("invite")).toBe("/criar-senha");
  });

  it("direciona recuperação para a redefinição de senha", () => {
    expect(passwordFlowFromTokenType("recovery")).toBe("recovery");
    expect(passwordFlowDestination("recovery")).toBe("/redefinir-senha");
  });

  it("recusa tipos de token que não são fluxos de senha", () => {
    expect(passwordFlowFromTokenType("email")).toBeNull();
    expect(passwordFlowFromTokenType(null)).toBeNull();
  });
});

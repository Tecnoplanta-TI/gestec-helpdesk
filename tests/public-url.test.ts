import { describe, expect, it } from "vitest";

import { publicUrl } from "@/lib/http/public-url";

const proxiedRequest = new Request("http://127.0.0.1:3000/auth/confirm", {
  headers: {
    host: "desk.gestec.io",
    "x-forwarded-proto": "https",
  },
});

describe("URL pública", () => {
  it("prioriza o domínio público configurado", () => {
    expect(publicUrl(proxiedRequest, "/criar-senha", "https://desk.gestec.io").href).toBe(
      "https://desk.gestec.io/criar-senha",
    );
  });

  it("usa os cabeçalhos do proxy quando não há domínio configurado", () => {
    expect(publicUrl(proxiedRequest, "/criar-senha", undefined).href).toBe(
      "https://desk.gestec.io/criar-senha",
    );
  });

  it("ignora um domínio configurado inválido", () => {
    expect(publicUrl(proxiedRequest, "/login", "not a url").href).toBe(
      "https://desk.gestec.io/login",
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: authMocks })),
}));

import { GET, POST } from "@/app/auth/confirm/route";

describe("callback de convite e recuperação", () => {
  beforeEach(() => {
    vi.stubEnv("GESTEC_AUTH_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    authMocks.verifyOtp.mockReset();
    authMocks.exchangeCodeForSession.mockReset();
  });

  it("não consome o OTP no GET, permitindo scanners de e-mail", async () => {
    const request = new NextRequest(
      "https://desk.gestec.io/auth/confirm?token_hash=one-time-token&type=recovery",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/auth/continuar",
    );
    expect(authMocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("valida o OTP de recuperação somente após o POST de confirmação", async () => {
    authMocks.verifyOtp.mockResolvedValue({ error: null });
    const request = new NextRequest("https://desk.gestec.io/auth/confirm", {
      method: "POST",
      headers: { origin: "https://desk.gestec.io" },
      body: new URLSearchParams({
        token_hash: "one-time-token",
        type: "recovery",
      }),
    });

    const response = await POST(request);

    expect(authMocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "one-time-token",
      type: "recovery",
    });
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/redefinir-senha",
    );
  });

  it("recusa POST vindo de outra origem sem validar o token", async () => {
    const request = new NextRequest("https://desk.gestec.io/auth/confirm", {
      method: "POST",
      headers: { origin: "https://example.org" },
      body: new URLSearchParams({
        token_hash: "one-time-token",
        type: "recovery",
      }),
    });

    const response = await POST(request);

    expect(authMocks.verifyOtp).not.toHaveBeenCalled();
    expect(new URL(response.headers.get("location")!).searchParams.get("recovery")).toBe(
      "invalid",
    );
  });
});

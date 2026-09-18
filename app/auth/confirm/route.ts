import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  getSupabaseEnvironment,
  isSupabaseAuthEnabled,
} from "@/lib/supabase/server";
import {
  passwordFlowDestination,
  passwordFlowFromTokenType,
} from "@/lib/auth/password-flow";
import { publicUrl } from "@/lib/http/public-url";

function loginRedirect(request: NextRequest, reason: "invite" | "recovery" = "invite") {
  return NextResponse.redirect(publicUrl(request, `/login?${reason}=invalid`));
}

export async function GET(request: NextRequest) {
  if (!isSupabaseAuthEnabled()) return loginRedirect(request);

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const flow = passwordFlowFromTokenType(type);
  if ((tokenHash && !flow) || (!tokenHash && !code)) {
    return loginRedirect(request, type === "recovery" ? "recovery" : "invite");
  }

  const destination = publicUrl(
    request,
    flow ? passwordFlowDestination(flow) : "/criar-senha",
  );
  const response = NextResponse.redirect(destination);
  const { url, publishableKey } = getSupabaseEnvironment();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const result = tokenHash
    ? await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: flow === "recovery" ? "recovery" : "invite",
      })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (result.error) {
    return loginRedirect(request, flow === "recovery" ? "recovery" : "invite");
  }

  return response;
}

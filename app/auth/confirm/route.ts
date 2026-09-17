import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  getSupabaseEnvironment,
  isSupabaseAuthEnabled,
} from "@/lib/supabase/server";

function loginRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?invite=invalid", request.url));
}

export async function GET(request: NextRequest) {
  if (!isSupabaseAuthEnabled()) return loginRedirect(request);

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  if ((!tokenHash || type !== "invite") && !code) return loginRedirect(request);

  const destination = new URL("/criar-senha", request.url);
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
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (result.error) return loginRedirect(request);

  return response;
}

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  passwordFlowDestination,
  passwordFlowFromTokenType,
} from "@/lib/auth/password-flow";
import { publicUrl } from "@/lib/http/public-url";
import {
  getSupabaseEnvironment,
  isSupabaseAuthEnabled,
} from "@/lib/supabase/server";

function loginRedirect(
  request: NextRequest,
  reason: "invite" | "recovery" = "invite",
) {
  return NextResponse.redirect(
    publicUrl(request, `/login?${reason}=invalid`),
  );
}

function continueRedirect(request: NextRequest, query: URLSearchParams) {
  const destination = publicUrl(request, "/auth/continuar");
  destination.search = query.toString();
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseAuthEnabled()) return loginRedirect(request);

  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const flow = passwordFlowFromTokenType(type);
  if (
    (tokenHash && (!flow || tokenHash.length > 2048)) ||
    (!tokenHash && (!code || code.length > 8192))
  ) {
    return loginRedirect(request, type === "recovery" ? "recovery" : "invite");
  }

  // Email security scanners often follow GET links automatically. Keep the
  // single-use Supabase token unverified until the user submits the form.
  const query = new URLSearchParams();
  if (tokenHash) query.set("token_hash", tokenHash);
  if (type) query.set("type", type);
  if (code) query.set("code", code);
  return continueRedirect(request, query);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseAuthEnabled()) return loginRedirect(request);

  const form = await request.formData();
  const tokenHashValue = form.get("token_hash");
  const typeValue = form.get("type");
  const codeValue = form.get("code");
  const tokenHash = typeof tokenHashValue === "string" ? tokenHashValue : "";
  const type = typeof typeValue === "string" ? typeValue : null;
  const code = typeof codeValue === "string" ? codeValue : "";
  const flow = passwordFlowFromTokenType(type);
  const origin = request.headers.get("origin");
  if (origin && origin !== publicUrl(request, "/").origin) {
    return loginRedirect(request, flow === "recovery" ? "recovery" : "invite");
  }
  if (
    (tokenHash && (!flow || tokenHash.length > 2048)) ||
    (!tokenHash && (!code || code.length > 8192))
  ) {
    return loginRedirect(request, type === "recovery" ? "recovery" : "invite");
  }

  const destination = publicUrl(
    request,
    flow ? passwordFlowDestination(flow) : "/criar-senha",
  );
  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  const { url, publishableKey } = getSupabaseEnvironment();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
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
    : await supabase.auth.exchangeCodeForSession(code);
  if (result.error) {
    return loginRedirect(request, flow === "recovery" ? "recovery" : "invite");
  }

  return response;
}

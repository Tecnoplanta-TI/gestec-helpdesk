import "./edge-global";
import { NextResponse, type NextRequest } from "next/server";

import {
  isJornadaOnlyAllowedPath,
  isJornadaOnlyModeEnabled,
} from "@/lib/features/jornada-only";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const hits = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: NextRequest) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

function rateLimit(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  const tight =
    pathname.includes("/attachments") || pathname.endsWith(".xlsx");
  const limit = tight ? 20 : 120;
  const key = `${tight ? "tight" : "api"}:${clientAddress(request)}`;
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  if (hits.size > 2_000) {
    for (const [storedKey, stored] of hits) {
      if (stored.resetAt <= now) hits.delete(storedKey);
    }
  }
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return new NextResponse("Muitas requisições. Tente de novo em instantes.", {
    status: 429,
    headers: { "retry-after": String(retryAfter) },
  });
}

export async function middleware(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const { pathname } = request.nextUrl;
  if (
    isJornadaOnlyModeEnabled() &&
    pathname.startsWith("/gestec_help_desk") &&
    !isJornadaOnlyAllowedPath(pathname)
  ) {
    return NextResponse.redirect(
      new URL("/gestec_help_desk/jornada", request.url),
    );
  }
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

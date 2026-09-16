import { NextResponse, type NextRequest } from "next/server";

import {
  isJornadaOnlyAllowedPath,
  isJornadaOnlyModeEnabled,
} from "@/lib/features/jornada-only";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

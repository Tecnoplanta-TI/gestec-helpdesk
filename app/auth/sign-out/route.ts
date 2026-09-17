import { NextResponse, type NextRequest } from "next/server";

import { publicUrl } from "@/lib/http/public-url";
import { createSupabaseServerClient, isSupabaseAuthEnabled } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(publicUrl(request, "/login"), 303);
}

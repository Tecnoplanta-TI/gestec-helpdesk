import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("A autenticação Supabase não foi configurada no ambiente.");
  }
  return { url, publishableKey };
}

export function isSupabaseAuthEnabled() {
  return process.env.GESTEC_AUTH_MODE === "supabase";
}

export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseEnvironment();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot persist cookies. The middleware refreshes
          // Supabase sessions before protected routes are rendered.
        }
      },
    },
  });
}

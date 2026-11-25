import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";
import { AuthTimeoutError, withTimeout } from "./timeout";

/** Supabase keeps the session in cookies named `sb-<project>-auth-token` (possibly split in `.0`, `.1`). */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export async function updateSupabaseSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    // getClaims() checks the token's signature locally (the signing keys are
    // cached) and only goes to the network to refresh an expired session,
    // unlike getUser(), which asks Supabase on every single navigation.
    const { data } = await withTimeout(supabase.auth.getClaims());
    return { response, user: data?.claims?.sub ? { id: data.claims.sub } : null, degraded: false };
  } catch (error) {
    if (!(error instanceof AuthTimeoutError)) throw error;
    // Supabase is slow or unreachable. The middleware is only a redirect gate:
    // the API validates the token on every request, so a visitor holding a
    // session cookie is let through (`user` unknown) instead of being locked
    // out behind a 504.
    return { response, user: null, degraded: hasSessionCookie(request) };
  }
}

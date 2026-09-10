import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Both sign-in and sign-up land on the dashboard; the dashboard routes new
  // users to the routine choice screen when they have no active routine.
  const next = searchParams.get("next") ?? `/${locale}/dashboard`;

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

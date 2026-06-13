import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intent = searchParams.get("intent");
  const next = searchParams.get("next") ?? (intent === "register" ? `/${locale}/onboarding` : `/${locale}/dashboard`);

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

import { getTranslations } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Server-only: the current user's email/id, or a locale-appropriate fallback. Never throws. */
export async function getSessionUserLabel(): Promise<string> {
  const t = await getTranslations("PrivateLayout");

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? user?.id ?? t("anonymous");
  } catch {
    return t("sessionUnavailable");
  }
}

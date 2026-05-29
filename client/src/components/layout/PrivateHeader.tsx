import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PrivateHeaderProps = {
  title: string;
  description: string;
};

export async function PrivateHeader({ title, description }: PrivateHeaderProps) {
  const t = await getTranslations("PrivateLayout");
  let userLabel = t("anonymous");

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userLabel = user?.email ?? user?.id ?? userLabel;
  } catch {
    userLabel = t("sessionUnavailable");
  }

  return (
    <header className="apex-card relative overflow-hidden rounded-[2rem] p-6 text-white">
      <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-[#a6ff00]/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="apex-logo text-xl"><span>APEX</span> <span className="apex-lime">FIT</span></p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/70 md:text-lg">{description}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm backdrop-blur md:min-w-64">
          <p className="font-semibold text-white/60">{t("signedInAs")}</p>
          <p className="mt-1 break-all font-bold">{userLabel}</p>
          <div className="mt-4">
            <LogoutButton label={t("logout")} loadingLabel={t("logoutLoading")} />
          </div>
        </div>
      </div>
    </header>
  );
}

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
    <header className="rounded-[2rem] bg-[#17130f] p-6 text-white shadow-xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">FIT AI</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/70 md:text-lg">{description}</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4 text-sm backdrop-blur md:min-w-64">
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

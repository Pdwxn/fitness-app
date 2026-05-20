import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { getHealthCheck } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function loadBackendStatus() {
  try {
    return await getHealthCheck();
  } catch {
    return null;
  }
}

async function loadSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export default async function Home({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [backendStatus, sessionUser, t] = await Promise.all([
    loadBackendStatus(),
    loadSessionUser(),
    getTranslations("Home"),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between bg-[#f7f3ec] px-5 py-8 text-[#17130f] md:max-w-3xl md:px-10 lg:max-w-5xl">
      <section className="flex flex-col gap-12">
        <nav className="flex items-center justify-between rounded-full border border-[#ded2bf] bg-white/70 px-4 py-3 shadow-sm">
          <span className="text-sm font-bold tracking-[0.2em]">FIT AI</span>
          <span className="rounded-full bg-[#17130f] px-3 py-1 text-xs font-medium text-white">
            {t("badge")}
          </span>
        </nav>

        <div className="flex flex-col gap-5 md:max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b5e34]">
            {t("eyebrow")}
          </p>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
            {t("title")}
          </h1>
          <p className="text-lg leading-8 text-[#5c5349] md:text-xl">
            {t("description")}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-[#17130f] p-5 text-white shadow-xl">
            <p className="text-sm text-white/60">{t("frontendLabel")}</p>
            <p className="mt-2 text-2xl font-bold">Next.js 15</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#ded2bf]">
            <p className="text-sm text-[#8b5e34]">{t("backendLabel")}</p>
            <p className="mt-2 text-2xl font-bold">Django REST</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#ded2bf]">
            <p className="text-sm text-[#8b5e34]">{t("apiStatusLabel")}</p>
            <p className="mt-2 text-2xl font-bold">
              {backendStatus ? t("online") : t("offline")}
            </p>
          </div>
        </div>

        <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-5 shadow-sm">
          <p className="text-sm font-medium text-[#8b5e34]">{t("sessionTitle")}</p>
          {sessionUser ? (
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-2xl font-bold">{t("sessionActive")}</p>
                <p className="mt-1 break-all text-sm text-[#5c5349]">
                  {sessionUser.email ?? sessionUser.id}
                </p>
              </div>
              <LogoutButton label={t("logout")} loadingLabel={t("logoutLoading")} />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-2xl font-bold">{t("sessionInactive")}</p>
                <p className="mt-1 text-sm text-[#5c5349]">{t("sessionHint")}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/${locale}/auth/login`}
                  className="rounded-full bg-[#17130f] px-5 py-3 text-center text-sm font-bold text-white"
                >
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="rounded-full border border-[#17130f] px-5 py-3 text-center text-sm font-bold"
                >
                  {t("register")}
                </Link>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="mt-12 rounded-3xl border border-[#ded2bf] bg-white/80 p-5 shadow-sm">
        <p className="text-sm font-medium text-[#8b5e34]">{t("healthcheck")}</p>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#17130f] p-4 text-sm text-[#f7f3ec]">
          {JSON.stringify(backendStatus ?? { status: "unavailable" }, null, 2)}
        </pre>
      </section>
    </main>
  );
}

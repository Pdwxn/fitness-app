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
    <main className="apex-bg relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-5 py-8 text-white md:max-w-4xl md:px-10 lg:max-w-6xl">
      <div className="pointer-events-none absolute -right-20 top-24 h-[28rem] w-[20rem] rounded-full bg-[#a6ff00]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-4 top-44 hidden h-96 w-64 rounded-full border border-[#a6ff00]/25 md:block" />

      <section className="relative flex flex-col gap-10">
        <nav className="flex items-center justify-between">
          <span className="apex-logo text-2xl md:text-3xl"><span>APEX</span> <span className="apex-lime">FIT</span></span>
          <span className="rounded-full border border-[#a6ff00]/70 px-4 py-2 text-xs font-black text-[#a6ff00]">
            {t("badge")}
          </span>
        </nav>

        <div className="grid gap-8 md:grid-cols-[1fr_0.85fr] md:items-center">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-black uppercase tracking-[0.32em] text-[#a6ff00]">
            {t("eyebrow")}
            </p>
            <h1 className="text-6xl font-black leading-[0.9] tracking-tight md:text-8xl">
              {locale === "es" ? (
                <>Entrena mejor. <span className="apex-lime">Progresa</span> cada día.</>
              ) : (
                <>Train smarter. <span className="apex-lime">Progress</span> every day.</>
              )}
            </h1>
            <p className="max-w-xl text-xl leading-9 text-white/68 md:text-2xl">{t("description")}</p>

            <div className="flex flex-col gap-3 sm:max-w-md">
              <Link
                href={sessionUser ? `/${locale}/dashboard` : `/${locale}/auth/register`}
                className="apex-button rounded-2xl px-6 py-5 text-center text-base font-black"
              >
                {t("primaryCta")} <span aria-hidden="true">→</span>
              </Link>
              <Link
                href={sessionUser ? `/${locale}/dashboard` : `/${locale}/auth/login`}
                className="apex-button-outline rounded-2xl px-6 py-5 text-center text-base font-black"
              >
                {sessionUser ? t("sessionActive") : t("secondaryCta")}
              </Link>
            </div>

            {sessionUser ? (
              <div className="apex-card rounded-[2rem] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">{t("sessionTitle")}</p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xl font-black">{t("sessionActive")}</p>
                    <p className="mt-1 break-all text-sm text-white/55">{sessionUser.email ?? sessionUser.id}</p>
                  </div>
                  <LogoutButton label={t("logout")} loadingLabel={t("logoutLoading")} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative min-h-72 overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl md:min-h-[32rem]">
            <div className="absolute -right-14 top-10 size-72 rounded-full bg-[#a6ff00]/25 blur-3xl" />
            <div className="absolute bottom-8 right-6 h-72 w-40 rounded-[5rem] bg-gradient-to-b from-white/20 via-[#a6ff00]/20 to-transparent blur-sm" />
            <div className="absolute bottom-0 right-0 h-72 w-56 rounded-tl-[7rem] bg-gradient-to-br from-[#222] via-[#111] to-black opacity-90" />
            <div className="absolute bottom-12 right-12 size-28 rotate-12 rounded-[2rem] border border-white/20 bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-2xl" />
            <div className="absolute bottom-8 left-6 max-w-52">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#a6ff00]">Apex engine</p>
              <p className="mt-2 text-2xl font-black">AI plans that move with you.</p>
            </div>
          </div>
        </div>

        <div className="apex-card grid gap-4 rounded-[2rem] p-5 md:grid-cols-3 md:p-6">
          <Feature icon="⚡" title={t("frontendLabel")} description={t("adaptiveDescription")} />
          <Feature icon="↗" title={t("backendLabel")} description={t("progressDescription")} />
          <Feature icon="☁" title={t("offlineSync")} description={t("offlineDescription")} />
        </div>
      </section>

      <section className="apex-card mt-8 rounded-[2rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{t("apiStatusLabel")}</p>
            <p className="mt-1 text-lg font-black"><span className={backendStatus ? "text-[#a6ff00]" : "text-red-300"}>●</span> {backendStatus ? t("online") : t("offline")}</p>
          </div>
          <p className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/55">{t("healthcheck")}</p>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/45 p-4 text-xs text-[#a6ff00]">
          {JSON.stringify(backendStatus ?? { status: "unavailable" }, null, 2)}
        </pre>
      </section>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-black/20 p-4 md:flex-col md:text-center">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#a6ff00]/15 text-2xl text-[#a6ff00] shadow-[0_0_28px_rgba(166,255,0,0.22)]">{icon}</span>
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-white/60">{description}</p>
      </div>
    </div>
  );
}

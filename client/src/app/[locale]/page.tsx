import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { ChevronRight, Clock, Play, Sparkles, TrendingUp, WifiOff, type LucideIcon } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { AthleteSilhouette } from "@/components/ui/AthleteSilhouette";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function Logo({ className }: { className: string }) {
  return (
    <p className={`apex-logo ${className}`}>
      <span>APEX</span> <span className="apex-lime">FIT</span>
    </p>
  );
}

export default async function Home({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [sessionUser, t] = await Promise.all([loadSessionUser(), getTranslations("Home")]);

  const primaryHref = sessionUser ? `/${locale}/dashboard` : `/${locale}/auth/register`;
  const secondaryHref = sessionUser ? `/${locale}/dashboard` : `/${locale}/auth/login`;

  const features: { icon: LucideIcon; title: string; description: string }[] = [
    { icon: Sparkles, title: t("features.ai.title"), description: t("features.ai.description") },
    { icon: TrendingUp, title: t("features.progress.title"), description: t("features.progress.description") },
    { icon: WifiOff, title: t("features.offline.title"), description: t("features.offline.description") },
  ];

  return (
    <div className="apex-bg relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute -top-36 left-[60px] size-[460px] rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.28)_0%,transparent_68%)] blur-[60px] md:left-[640px] md:size-[900px]" />

      <div className="relative mx-auto flex max-w-[1280px] flex-col">
        <header className="flex min-h-11 items-center px-5 pt-6 md:px-20 md:pt-9">
          <Logo className="text-2xl md:text-[30px]" />
        </header>

        <main className="flex flex-col gap-14 md:gap-[120px]">
          <section
            aria-label={t("eyebrow")}
            className="grid gap-5 px-5 pt-9 md:min-h-[600px] md:grid-cols-[1.1fr_1fr] md:items-center md:gap-6 md:px-20 md:pt-14"
          >
            <div className="flex flex-col gap-5 md:gap-7">
              <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-[#a6ff00] md:text-[15px]">
                {t("eyebrow")}
              </p>
              <h1 className="text-balance text-[46px] font-black leading-[1.02] tracking-tight md:text-[84px] md:leading-[0.98]">
                {t.rich("title", { accent: (chunks) => <span className="text-[#a6ff00]">{chunks}</span> })}
              </h1>
              <p className="max-w-[520px] text-[19px] font-medium leading-snug text-white/60 md:text-2xl">
                {t("description")}
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:max-w-md md:flex-row md:gap-4">
                <Link
                  href={primaryHref}
                  className="apex-button flex h-16 items-center justify-center whitespace-nowrap rounded-[2rem] px-8 text-[19px] font-extrabold md:h-[68px]"
                >
                  {t("primaryCta")} <span aria-hidden="true">&nbsp;→</span>
                </Link>
                <Link
                  href={secondaryHref}
                  className="flex h-[60px] items-center justify-center whitespace-nowrap rounded-[1.875rem] border-[1.5px] border-white/30 px-8 text-[19px] font-bold md:h-[68px]"
                >
                  {sessionUser ? t("sessionActive") : t("login")}
                </Link>
              </div>

              {sessionUser ? (
                <div className="apex-card rounded-[2rem] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">{t("sessionTitle")}</p>
                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-all text-sm text-white/55">{sessionUser.email ?? sessionUser.id}</p>
                    <LogoutButton label={t("logout")} loadingLabel={t("logoutLoading")} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative -mx-5 mt-2 h-[340px] overflow-hidden md:mx-0 md:mt-0 md:h-[640px] md:overflow-visible">
              <div className="pointer-events-none absolute left-[15px] top-5 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.55)_0%,transparent_68%)] blur-[50px] md:left-5 md:top-[60px] md:size-[560px] md:blur-[70px]" />
              <AthleteSilhouette className="pointer-events-none absolute -bottom-5 left-[45px] h-[340px] w-[300px] md:bottom-0 md:left-auto md:right-0 md:h-[634px] md:w-[560px]" />
              <div className="absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-b from-transparent to-[#020303] md:hidden" />
            </div>
          </section>

          <section className="px-5 md:px-20">
            <ul className="grid border-t border-white/[0.13] md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }, index) => (
                <li
                  key={title}
                  className={`flex items-center gap-4 border-b border-white/10 py-5 last:border-b-0 md:gap-5 md:border-b-0 md:px-9 md:py-8 ${
                    index > 0 ? "md:border-l md:border-white/[0.13]" : "md:pl-0"
                  }`}
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/[0.08] text-[#a6ff00] md:size-16">
                    <Icon aria-hidden="true" size={26} strokeWidth={1.5} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-[19px] font-extrabold md:text-[22px]">{title}</p>
                    <p className="text-base leading-snug text-white/60 md:text-[17px]">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label={t("app.title")}
            className="grid gap-8 px-5 md:grid-cols-2 md:items-center md:gap-16 md:px-20"
          >
            <div className="flex flex-col gap-3 md:gap-6">
              <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-[#a6ff00] md:text-[15px]">
                {t("app.eyebrow")}
              </p>
              <h2 className="text-balance text-[38px] font-black leading-[1.05] tracking-tight md:text-[64px] md:leading-[1.02]">
                {t("app.title")}
              </h2>
              <Link
                href={primaryHref}
                className="apex-button mt-3 hidden h-[68px] w-fit items-center justify-center whitespace-nowrap rounded-[2.125rem] px-8 text-[19px] font-extrabold md:flex"
              >
                {t("primaryCta")} <span aria-hidden="true">&nbsp;→</span>
              </Link>
            </div>

            <div className="relative flex justify-center">
              <div className="pointer-events-none absolute -left-[60px] top-[100px] size-[425px] rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.35)_0%,transparent_68%)] blur-[60px]" />
              <PhoneMock
                labels={{
                  upNext: t("app.mock.upNext"),
                  day: t("app.mock.day"),
                  meta: t("app.mock.meta"),
                  start: t("app.mock.start"),
                  firstExercises: t("app.mock.firstExercises"),
                  viewRoutine: t("app.mock.viewRoutine"),
                  exercises: [
                    { name: t("app.mock.exercise1"), detail: t("app.mock.exercise1Detail") },
                    { name: t("app.mock.exercise2"), detail: t("app.mock.exercise2Detail") },
                  ],
                }}
              />
            </div>

            <Link
              href={primaryHref}
              className="apex-button flex h-16 items-center justify-center whitespace-nowrap rounded-[2rem] px-8 text-[19px] font-extrabold md:hidden"
            >
              {t("primaryCta")} <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </section>
        </main>

        <footer className="flex items-center px-5 pb-12 pt-14 md:px-20 md:pb-14 md:pt-24">
          <Logo className="text-xl md:text-[22px]" />
        </footer>
      </div>
    </div>
  );
}

type PhoneMockLabels = {
  upNext: string;
  day: string;
  meta: string;
  start: string;
  firstExercises: string;
  viewRoutine: string;
  exercises: { name: string; detail: string }[];
};

/** Static, decorative preview of the dashboard (aria-hidden): sample content, not the user's data. */
function PhoneMock({ labels }: { labels: PhoneMockLabels }) {
  return (
    <div
      aria-hidden="true"
      className="relative rounded-[50px] border border-white/[0.22] bg-[#0b0c0b] p-[9px] shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_90px_rgba(166,255,0,0.14)]"
    >
      <div className="relative h-[560px] w-[304px] overflow-hidden rounded-[42px] bg-[#020303] md:h-[620px] md:w-[340px]">
        <div className="flex flex-col gap-4 px-4 pt-5">
          <Logo className="text-xl" />
          <div className="relative flex h-[300px] flex-col gap-2.5 overflow-hidden rounded-[28px] border border-white/[0.13] bg-white/[0.065] p-5">
            <div className="pointer-events-none absolute left-16 top-8 size-64 rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.5)_0%,transparent_68%)] blur-[40px]" />
            <AthleteSilhouette className="pointer-events-none absolute -right-4 bottom-[76px] h-[220px] w-[195px]" />
            <p className="relative text-xs font-bold uppercase tracking-[0.22em] text-[#a6ff00]">{labels.upNext}</p>
            <p className="relative max-w-[170px] text-[30px] font-black leading-[1.02] tracking-tight">{labels.day}</p>
            <p className="relative flex items-center gap-2 text-sm font-medium text-white/60">
              <Clock size={16} strokeWidth={1.5} />
              {labels.meta}
            </p>
            <div className="relative mt-auto flex h-[54px] items-center justify-center gap-2 rounded-[27px] bg-[#a6ff00] text-base font-extrabold text-black">
              <Play size={18} fill="currentColor" strokeWidth={0} />
              {labels.start}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-extrabold">{labels.firstExercises}</p>
            <p className="text-sm font-bold text-[#a6ff00]">{labels.viewRoutine}</p>
          </div>
          <div className="border-t border-white/[0.13]">
            {labels.exercises.map((exercise, index) => (
              <div key={exercise.name} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-b-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/[0.22] text-sm font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{exercise.name}</p>
                  <p className="text-[13px] font-medium text-white/60">{exercise.detail}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-white/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

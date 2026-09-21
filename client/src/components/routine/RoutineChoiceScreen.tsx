"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ClipboardList, Sparkles, WifiOff, type LucideIcon } from "lucide-react";

type RoutineChoiceScreenProps = {
  locale: string;
  hasPending?: boolean;
};

/** The full-page "how do you want to start?" choice: build manually, or let the AI generate a plan. */
export function RoutineChoiceScreen({ locale, hasPending = false }: RoutineChoiceScreenProps) {
  const t = useTranslations("RoutineChoice");

  return (
    <div className="flex flex-col gap-7">
      {hasPending ? (
        <section className="rounded-[2rem] border border-amber-300/30 bg-amber-400/10 p-4">
          <p className="text-sm font-bold text-amber-100">{t("pendingBanner")}</p>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#a6ff00]">{t("eyebrow")}</p>
        <h1 className="text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">{t("title")}</h1>
        <p className="max-w-xl text-lg font-medium leading-snug text-white/60">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChoiceCard
          href={`/${locale}/routine/builder`}
          icon={ClipboardList}
          title={t("manual.title")}
          description={t("manual.description")}
          badge={t("manual.offline")}
        />
        <ChoiceCard
          href={`/${locale}/onboarding`}
          icon={Sparkles}
          title={t("ai.title")}
          description={t("ai.description")}
          highlighted
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  highlighted = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[220px] flex-col gap-4 rounded-[2rem] border p-6 text-white ${
        highlighted ? "border-[#a6ff00]/55 bg-[#a6ff00]/[0.07]" : "border-white/[0.13] bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="grid size-[60px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/10 text-[#a6ff00]">
          <Icon aria-hidden="true" size={28} strokeWidth={1.5} />
        </span>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#a6ff00] text-black transition group-hover:translate-x-0.5">
          <ArrowRight aria-hidden="true" size={24} strokeWidth={2.2} />
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[28px] font-black leading-tight tracking-tight">{title}</p>
        <p className="text-base leading-6 text-white/60">{description}</p>
      </div>
      {badge ? (
        <span className="mt-auto flex w-fit items-center gap-2 rounded-full border border-[#a6ff00]/40 px-3.5 py-2 text-sm font-semibold text-[#a6ff00]">
          <WifiOff aria-hidden="true" size={18} strokeWidth={1.5} />
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

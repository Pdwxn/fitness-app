"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type RoutineChoiceScreenProps = {
  locale: string;
  hasPending?: boolean;
};

export function RoutineChoiceScreen({ locale, hasPending = false }: RoutineChoiceScreenProps) {
  const t = useTranslations("RoutineChoice");

  return (
    <div className="flex flex-col gap-4">
      {hasPending ? (
        <section className="rounded-[2rem] border border-amber-300/30 bg-amber-400/10 p-4">
          <p className="text-sm font-bold text-amber-100">{t("pendingBanner")}</p>
        </section>
      ) : null}

      <section className="apex-card rounded-[2rem] p-6 text-white">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">
          {t("eyebrow")}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">{t("title")}</h2>
        <p className="mt-3 text-base leading-7 text-white/65">{t("description")}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceCard
          href={`/${locale}/routine/builder`}
          title={t("manual.title")}
          description={t("manual.description")}
          cta={t("manual.cta")}
          primary
        />
        <ChoiceCard
          href={`/${locale}/onboarding`}
          title={t("ai.title")}
          description={t("ai.description")}
          cta={t("ai.cta")}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  href,
  title,
  description,
  cta,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <section className="apex-card flex flex-col rounded-[1.5rem] p-5 text-white">
      <h3 className="text-xl font-black tracking-tight">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-white/60">{description}</p>
      <Link
        href={href}
        className={`${primary ? "apex-button" : "apex-button-outline"} mt-4 rounded-2xl py-3 text-center text-sm font-black`}
      >
        {cta}
      </Link>
    </section>
  );
}

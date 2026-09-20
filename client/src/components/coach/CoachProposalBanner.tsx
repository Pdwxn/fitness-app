"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";

import { usePendingProposal } from "@/hooks/usePendingProposal";

/** Dashboard nudge shown whenever the AI coach has edits waiting for review. */
export function CoachProposalBanner({ locale }: { locale: string }) {
  const t = useTranslations("Coach.banner");
  const { proposal } = usePendingProposal();

  if (!proposal) return null;

  return (
    <section className="flex flex-col gap-4 rounded-[2rem] border border-[#a6ff00]/40 bg-[#a6ff00]/[0.07] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/10 text-[#a6ff00]">
          <Sparkles aria-hidden="true" size={22} strokeWidth={1.6} />
        </span>
        <div>
          <p className="text-lg font-extrabold leading-tight">{t("title")}</p>
          <p className="mt-1 text-[15px] leading-snug text-white/60">{t("description")}</p>
        </div>
      </div>
      <Link
        href={`/${locale}/routine/review`}
        className="apex-button flex h-12 shrink-0 items-center justify-center gap-2 rounded-3xl px-6 text-base font-extrabold"
      >
        {t("cta")}
        <ArrowRight aria-hidden="true" size={20} strokeWidth={2.2} />
      </Link>
    </section>
  );
}

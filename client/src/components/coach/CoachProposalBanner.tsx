"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { usePendingProposal } from "@/hooks/usePendingProposal";

/** Dashboard nudge shown whenever the AI coach has edits waiting for review. */
export function CoachProposalBanner({ locale }: { locale: string }) {
  const t = useTranslations("Coach.banner");
  const { proposal } = usePendingProposal();

  if (!proposal) return null;

  return (
    <section className="flex flex-col gap-3 rounded-[2rem] border border-[#a6ff00]/30 bg-[#a6ff00]/10 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-base font-black text-[#d7ff8a]">{t("title")}</p>
        <p className="mt-1 text-sm text-white/70">{t("description")}</p>
      </div>
      <Link
        href={`/${locale}/routine/review`}
        className="apex-button shrink-0 rounded-xl px-5 py-2.5 text-center text-sm font-black"
      >
        {t("cta")}
      </Link>
    </section>
  );
}

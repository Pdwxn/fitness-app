"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNextRoutineStore } from "@/store/nextRoutineStore";

function monthName(locale: string, month: number, year: number): string {
  const name = new Date(year, month - 1).toLocaleString(locale, { month: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function NextRoutineWatcher({ locale }: { locale: string }) {
  const t = useTranslations("Routine");
  const tCoach = useTranslations("Coach.toast");
  const nextRoutine = useNextRoutineStore((s) => s.nextRoutine);
  const clearNextRoutine = useNextRoutineStore((s) => s.clearNextRoutine);
  const nextProposal = useNextRoutineStore((s) => s.nextProposal);
  const clearNextProposal = useNextRoutineStore((s) => s.clearNextProposal);
  const shownRef = useRef(false);
  const shownProposalRef = useRef(false);

  useEffect(() => {
    if (!nextProposal || shownProposalRef.current) return;

    toast.success(
      tCoach("ready", { month: monthName(locale, nextProposal.target_month, nextProposal.target_year) }),
      {
        action: {
          label: tCoach("review"),
          onClick: () => {
            window.location.href = `/${locale}/routine/review`;
          },
        },
        duration: 12000,
      },
    );

    shownProposalRef.current = true;
    clearNextProposal();
  }, [nextProposal, locale, tCoach, clearNextProposal]);

  useEffect(() => {
    if (!nextRoutine || shownRef.current) return;

    const date = new Date(nextRoutine.year, nextRoutine.month - 1);
    const monthName = date.toLocaleString(locale, { month: "long" });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    toast.success(t("nextRoutineReady", { month: capitalized }), {
      action: {
        label: t("viewRoutine"),
        onClick: () => {
          window.location.href = `/${locale}/routine`;
        },
      },
      duration: 10000,
    });

    shownRef.current = true;
    clearNextRoutine();
  }, [nextRoutine, locale, t, clearNextRoutine]);

  return null;
}

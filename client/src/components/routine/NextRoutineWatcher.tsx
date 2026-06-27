"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useNextRoutineStore } from "@/store/nextRoutineStore";

export function NextRoutineWatcher({ locale }: { locale: string }) {
  const t = useTranslations("Routine");
  const nextRoutine = useNextRoutineStore((s) => s.nextRoutine);
  const clearNextRoutine = useNextRoutineStore((s) => s.clearNextRoutine);
  const shownRef = useRef(false);

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

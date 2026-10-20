"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";

import { useRoutineBuilderStore } from "@/store/routineBuilderStore";

type RepeatWeekButtonProps = {
  /** The week shown right now -- the one that gets copied. */
  weekIdx: number;
  weekNumber: number;
};

/**
 * "Repeat this week for the rest of the month": copies the visible week's
 * days into every other week (up to the 4-week max), for routines that don't
 * change week to week. Opt-in and a one-time copy -- building each week by
 * hand, like today, still works exactly the same.
 */
export function RepeatWeekButton({ weekIdx, weekNumber }: RepeatWeekButtonProps) {
  const t = useTranslations("Builder.repeatWeek");
  const repeatWeekForRestOfMonth = useRoutineBuilderStore((state) => state.repeatWeekForRestOfMonth);
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    repeatWeekForRestOfMonth(weekIdx);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-3xl border-[1.5px] border-dashed border-white/30 text-[15px] font-bold text-white/80"
      >
        <CalendarRange aria-hidden="true" size={20} strokeWidth={1.8} />
        {t("cta")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="repeat-week-title"
            aria-describedby="repeat-week-body"
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="flex w-full max-w-sm flex-col gap-5 rounded-[2rem] border border-white/[0.18] bg-[#111411] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
          >
            <div className="flex flex-col gap-2">
              <h3 id="repeat-week-title" className="text-2xl font-black leading-tight tracking-tight">
                {t("title", { week: weekNumber })}
              </h3>
              <p id="repeat-week-body" className="text-base leading-relaxed text-white/60">
                {t("body", { week: weekNumber })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                className="flex h-[52px] flex-1 items-center justify-center rounded-3xl border-[1.5px] border-white/30 text-base font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="apex-button flex h-[52px] flex-1 items-center justify-center rounded-3xl text-base font-extrabold"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

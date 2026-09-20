"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRight, ArrowUp, Calendar, Minus, Plus, Repeat, TrendingUp, type LucideIcon } from "lucide-react";

import type { CoachChange } from "@/types/coach";

function signed(value: number, suffix = ""): string {
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

const TYPE_ICONS: Record<CoachChange["type"], LucideIcon> = {
  adjust_load: TrendingUp,
  substitute_exercise: Repeat,
  add_exercise: Plus,
  remove_exercise: Minus,
};

/** One proposed change: what happens, on which day, and the coach's reason. */
export function CoachChangeCard({ change }: { change: CoachChange }) {
  const t = useTranslations("Coach");

  const deltas: { label: string; value: number | null }[] = [];
  const detailLines: string[] = [];
  let headline: React.ReactNode;
  let headlineText: string;

  switch (change.type) {
    case "adjust_load":
      headlineText = change.exercise_name;
      headline = change.exercise_name;
      if (change.weight_change_percent != null) {
        deltas.push({
          label: t("adjust.weight", { percent: signed(change.weight_change_percent, "%") }),
          value: change.weight_change_percent,
        });
      }
      if (change.sets_delta != null) {
        deltas.push({ label: t("adjust.sets", { delta: signed(change.sets_delta) }), value: change.sets_delta });
      }
      if (change.reps) detailLines.push(t("adjust.reps", { reps: change.reps }));
      if (change.rest_seconds != null) {
        detailLines.push(t("adjust.rest", { seconds: change.rest_seconds }));
      }
      break;
    case "substitute_exercise":
      headlineText = t("substituteLine", { from: change.exercise_name, to: change.new_exercise.name });
      headline = (
        <>
          <span className="text-white/60">{change.exercise_name}</span>{" "}
          <ArrowRight aria-hidden="true" size={22} strokeWidth={2} className="inline align-middle text-[#a6ff00]" />{" "}
          <span>{change.new_exercise.name}</span>
        </>
      );
      break;
    case "add_exercise":
      headlineText = change.exercise.name;
      headline = change.exercise.name;
      detailLines.push(t("addLine", { sets: change.exercise.sets, reps: change.exercise.reps }));
      break;
    case "remove_exercise":
      headlineText = change.exercise_name;
      headline = change.exercise_name;
      break;
  }

  const Icon = TYPE_ICONS[change.type];
  const removal = change.type === "remove_exercise";

  return (
    <article
      aria-label={`${t(`types.${change.type}`)}: ${t("day", { day: change.day_number })}`}
      className="flex flex-col gap-3.5 border-t border-white/[0.13] pt-5 text-white"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[15px] font-bold ${
            removal
              ? "border-red-400/55 bg-red-400/[0.08] text-red-300"
              : "border-[#a6ff00]/55 bg-[#a6ff00]/[0.08] text-[#a6ff00]"
          }`}
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
          {t(`types.${change.type}`)}
        </span>
        <span className="rounded-full border border-white/[0.22] px-3.5 py-1.5 text-[15px] font-bold">
          {t("day", { day: change.day_number })}
        </span>
      </div>

      <h3 aria-label={headlineText} className="text-[23px] font-extrabold leading-tight tracking-tight">
        {headline}
      </h3>

      {deltas.length ? (
        <div className="flex flex-wrap gap-2">
          {deltas.map(({ label, value }) => {
            const up = (value ?? 0) >= 0;
            const Arrow = up ? ArrowUp : ArrowDown;
            return (
              <span
                key={label}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[17px] font-extrabold ${
                  up
                    ? "border-[#a6ff00]/40 bg-[#a6ff00]/[0.14] text-[#a6ff00]"
                    : "border-white/[0.22] bg-white/[0.06] text-white"
                }`}
              >
                <Arrow aria-hidden="true" size={18} strokeWidth={2.4} />
                <span>{label}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {detailLines.length ? (
        <ul className="text-base font-bold text-white/70">
          {detailLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-base leading-snug text-white/60">
        <strong className="font-bold text-white">{t("why")}:</strong> {change.why}
      </p>
      <p className="flex items-center gap-2 border-t border-white/10 pt-3 text-sm font-medium text-white/60">
        <Calendar aria-hidden="true" size={18} strokeWidth={1.5} className="shrink-0" />
        {t("allWeeks")}
      </p>
    </article>
  );
}

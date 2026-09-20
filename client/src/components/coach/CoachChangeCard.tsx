"use client";

import { useTranslations } from "next-intl";

import type { CoachChange } from "@/types/coach";

function signed(value: number, suffix = ""): string {
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

/** One proposed change: what happens, on which day, and the coach's reason. */
export function CoachChangeCard({ change }: { change: CoachChange }) {
  const t = useTranslations("Coach");

  const detailLines: string[] = [];
  let headline: string;

  switch (change.type) {
    case "adjust_load":
      headline = change.exercise_name;
      if (change.weight_change_percent != null) {
        detailLines.push(t("adjust.weight", { percent: signed(change.weight_change_percent, "%") }));
      }
      if (change.sets_delta != null) {
        detailLines.push(t("adjust.sets", { delta: signed(change.sets_delta) }));
      }
      if (change.reps) detailLines.push(t("adjust.reps", { reps: change.reps }));
      if (change.rest_seconds != null) {
        detailLines.push(t("adjust.rest", { seconds: change.rest_seconds }));
      }
      break;
    case "substitute_exercise":
      headline = t("substituteLine", { from: change.exercise_name, to: change.new_exercise.name });
      break;
    case "add_exercise":
      headline = change.exercise.name;
      detailLines.push(t("addLine", { sets: change.exercise.sets, reps: change.exercise.reps }));
      break;
    case "remove_exercise":
      headline = change.exercise_name;
      break;
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-white">
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
        <span className="rounded-full bg-[#a6ff00]/15 px-3 py-1 text-[#a6ff00]">
          {t(`types.${change.type}`)}
        </span>
        <span className="text-white/50">{t("day", { day: change.day_number })}</span>
      </div>
      <h3 className="mt-3 text-lg font-black tracking-tight">{headline}</h3>
      {detailLines.length ? (
        <ul className="mt-1 text-sm font-bold text-white/70">
          {detailLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-white/60">
        <span className="font-black text-white/80">{t("why")}: </span>
        {change.why}
      </p>
      <p className="mt-2 text-xs font-bold text-white/40">{t("allWeeks")}</p>
    </article>
  );
}

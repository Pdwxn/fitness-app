"use client";

import { useTranslations } from "next-intl";

import { MAX_SETS } from "@/lib/setLog";
import type { ExerciseSet } from "@/types/progress";

type ExerciseSetLogProps = {
  exerciseName: string;
  sets: ExerciseSet[];
  /** Planned reps ("8-10"), shown as the placeholder so the target is visible while logging. */
  plannedReps: string;
  onChange: (index: number, patch: Partial<ExerciseSet>) => void;
  onAdd: () => void;
  onRemove: () => void;
};

/** One row per set: reps, weight and a tick. Only ticked sets count as done. */
export function ExerciseSetLog({
  exerciseName,
  sets,
  plannedReps,
  onChange,
  onAdd,
  onRemove,
}: ExerciseSetLogProps) {
  const t = useTranslations("RoutineDay.tracker");

  return (
    <div className="mt-4">
      <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.14em] text-[#a6ff00]">
        <span>{t("setNumber")}</span>
        <span>{t("reps")}</span>
        <span>{t("kg")}</span>
        <span className="text-center">{t("done")}</span>
      </div>

      <ol className="mt-2 grid gap-2">
        {sets.map((set, index) => (
          <li
            key={index}
            className={`grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-2xl border px-1 py-1.5 transition ${
              set.completed ? "border-[#a6ff00]/40 bg-[#a6ff00]/10" : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <span className="text-center text-sm font-black text-white/60">{index + 1}</span>
            <input
              inputMode="numeric"
              value={set.reps ?? ""}
              placeholder={plannedReps || "-"}
              aria-label={t("repsAria", { number: index + 1, exercise: exerciseName })}
              onChange={(event) => onChange(index, { reps: event.target.value })}
              className="apex-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <input
              inputMode="decimal"
              value={set.weight_kg ?? ""}
              aria-label={t("kgAria", { number: index + 1, exercise: exerciseName })}
              onChange={(event) => onChange(index, { weight_kg: event.target.value })}
              className="apex-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              role="checkbox"
              aria-checked={set.completed}
              aria-label={t("doneAria", { number: index + 1, exercise: exerciseName })}
              onClick={() => onChange(index, { completed: !set.completed })}
              className={`mx-auto grid size-10 place-items-center rounded-xl border text-lg font-black transition ${
                set.completed
                  ? "border-[#a6ff00] bg-[#a6ff00] text-black"
                  : "border-white/20 bg-transparent text-transparent hover:border-white/50"
              }`}
            >
              ✓
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={sets.length >= MAX_SETS}
          className="apex-button-outline rounded-xl px-4 py-2 text-xs font-black disabled:opacity-40"
        >
          {t("addSet")}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={sets.length <= 1}
          className="apex-button-outline rounded-xl px-4 py-2 text-xs font-black disabled:opacity-40"
        >
          {t("removeSet")}
        </button>
      </div>
    </div>
  );
}

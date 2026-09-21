"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Check, X } from "lucide-react";

import {
  addSet,
  deriveAggregates,
  removeLastSet,
  updateSet,
} from "@/lib/setLog";
import type { ExerciseLog, ExerciseSet } from "@/types/progress";
import type { RoutineExercise } from "@/types/routine";

import { ExerciseMedia } from "./ExerciseMedia";
import { ExerciseSetLog } from "./ExerciseSetLog";
import { ProgressionBadge } from "./ProgressionBadge";
import { ProgressionPolicySelect } from "./ProgressionPolicySelect";

type ExerciseSheetContentProps = {
  exercise: RoutineExercise;
  log: ExerciseLog;
  onChange: (update: (entry: ExerciseLog) => ExerciseLog) => void;
  onClose?: () => void;
  onAdvance: () => void;
  isLast: boolean;
};

/**
 * The exercise editor itself: demo, prescription + completion badge, the
 * suggestion, the set table, note, and the advance button. Rendered as a
 * mobile bottom sheet (with `onClose`) and, unchanged, as the always-visible
 * desktop detail panel (without `onClose`) -- see DailyLogForm.
 */
export function ExerciseSheetContent({
  exercise,
  log,
  onChange,
  onClose,
  onAdvance,
  isLast,
}: ExerciseSheetContentProps) {
  const t = useTranslations("RoutineDay.sheet");

  const sets = log.sets ?? [];
  const { completed } = deriveAggregates(sets);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black leading-tight tracking-tight">{exercise.name}</h2>
          {exercise.muscle_group ? <p className="mt-0.5 text-sm font-medium text-white/60">{exercise.muscle_group}</p> : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-white/30 text-white"
          >
            <X aria-hidden="true" size={22} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold">
          {exercise.sets ?? sets.length} × {exercise.reps || "-"}
        </p>
        {completed ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#a6ff00] px-3 py-1.5 text-xs font-black text-black">
            <Check aria-hidden="true" size={16} strokeWidth={2.6} />
            {t("exerciseDone")}
          </span>
        ) : null}
      </div>

      <ExerciseMedia name={exercise.name} imageUrl={exercise.image_url} demoUrl={exercise.video_url} />

      <ProgressionBadge exercise={exercise} />
      <ProgressionPolicySelect exercise={exercise} />

      <ExerciseSetLog
        exerciseName={exercise.name}
        sets={sets}
        plannedReps={exercise.reps}
        onChange={(index, patch: Partial<ExerciseSet>) => onChange((entry) => updateSet(entry, index, patch, exercise))}
        onAdd={() => onChange(addSet)}
        onRemove={() => onChange(removeLastSet)}
      />

      <label className="block">
        <span className="sr-only">{t("noteLabel")}</span>
        <input
          value={log.note}
          onChange={(event) => onChange((entry) => ({ ...entry, note: event.target.value }))}
          placeholder={t("notePlaceholder")}
          className="apex-input w-full rounded-2xl px-4 py-3 text-base"
        />
      </label>

      {exercise.instructions ? (
        <p className="text-sm leading-6 text-white/60">{exercise.instructions}</p>
      ) : null}

      {exercise.variants?.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#a6ff00]">{t("variants")}</h3>
          {exercise.variants.map((variant) => (
            <div key={variant.name} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <p className="font-bold">{variant.name}</p>
              <p className="mt-0.5 text-sm leading-6 text-white/60">{variant.description}</p>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onAdvance}
        className="apex-button flex h-[60px] items-center justify-center gap-2.5 rounded-[1.875rem] text-lg font-extrabold"
      >
        <span>{isLast ? t("backToList") : t("nextExercise")}</span>
        {isLast ? <Check aria-hidden="true" size={22} strokeWidth={2.4} /> : <ArrowRight aria-hidden="true" size={22} strokeWidth={2.2} />}
      </button>
    </div>
  );
}

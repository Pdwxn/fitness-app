"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRoutineBuilderStore } from "@/store/routineBuilderStore";
import type { DraftDay, DraftExercise } from "@/types/routine";
import type { Exercise } from "@/types/exercise";

import { ExercisePicker } from "./ExercisePicker";

type RoutineDayEditorProps = {
  weekIdx: number;
  dayIdx: number;
  day: DraftDay;
  canRemove: boolean;
};

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RoutineDayEditor({ weekIdx, dayIdx, day, canRemove }: RoutineDayEditorProps) {
  const t = useTranslations("Builder");
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    setDayName,
    toggleRestDay,
    removeDay,
    addExercise,
    removeExercise,
    setExerciseField,
    moveExercise,
  } = useRoutineBuilderStore();

  const handlePick = (exercise: Exercise) => {
    addExercise(weekIdx, dayIdx, exercise);
    setPickerOpen(false);
  };

  const handleField = (
    exerciseIdx: number,
    field: keyof DraftExercise,
    raw: string,
  ) => {
    const patch: Partial<DraftExercise> =
      field === "sets" || field === "rest_seconds"
        ? { [field]: numberOrNull(raw) }
        : { [field]: raw };
    setExerciseField(weekIdx, dayIdx, exerciseIdx, patch);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-white/40">{t("day")} {day.day_number}</span>
        <input
          value={day.day_name}
          onChange={(event) => setDayName(weekIdx, dayIdx, event.target.value)}
          placeholder={t("dayNamePlaceholder")}
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm font-bold text-white"
        />
        {canRemove ? (
          <button
            type="button"
            onClick={() => removeDay(weekIdx, dayIdx)}
            className="text-xs font-bold text-red-300"
          >
            {t("removeDay")}
          </button>
        ) : null}
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs font-bold text-white/60">
        <input
          type="checkbox"
          checked={day.is_rest_day}
          onChange={() => toggleRestDay(weekIdx, dayIdx)}
        />
        {t("restDay")}
      </label>

      {!day.is_rest_day ? (
        <div className="mt-3 flex flex-col gap-2">
          {day.exercises.map((exercise, exerciseIdx) => (
            <div
              key={exerciseIdx}
              className="rounded-xl border border-white/10 bg-black/30 p-2"
            >
              <div className="flex items-center gap-2">
                <input
                  value={exercise.name}
                  onChange={(event) => handleField(exerciseIdx, "name", event.target.value)}
                  placeholder="—"
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => moveExercise(weekIdx, dayIdx, exerciseIdx, "up")}
                  disabled={exerciseIdx === 0}
                  aria-label={t("moveUp")}
                  className="px-1 text-white/50 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveExercise(weekIdx, dayIdx, exerciseIdx, "down")}
                  disabled={exerciseIdx === day.exercises.length - 1}
                  aria-label={t("moveDown")}
                  className="px-1 text-white/50 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeExercise(weekIdx, dayIdx, exerciseIdx)}
                  className="text-xs font-bold text-red-300"
                >
                  {t("removeExercise")}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={exercise.sets ?? ""}
                  onChange={(event) => handleField(exerciseIdx, "sets", event.target.value)}
                  placeholder={t("sets")}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                />
                <input
                  value={exercise.reps}
                  onChange={(event) => handleField(exerciseIdx, "reps", event.target.value)}
                  placeholder={t("reps")}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={exercise.rest_seconds ?? ""}
                  onChange={(event) => handleField(exerciseIdx, "rest_seconds", event.target.value)}
                  placeholder={t("rest")}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                />
                <input
                  value={exercise.weight_kg ?? ""}
                  onChange={(event) => handleField(exerciseIdx, "weight_kg", event.target.value)}
                  placeholder={t("weight")}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="apex-button-outline rounded-xl py-2 text-xs font-black"
          >
            {t("addExercise")}
          </button>
        </div>
      ) : null}

      {pickerOpen ? (
        <ExercisePicker
          onPick={handlePick}
          onAddCustom={() => {
            addExercise(weekIdx, dayIdx);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

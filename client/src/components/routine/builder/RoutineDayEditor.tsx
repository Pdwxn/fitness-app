"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

import { useWeightUnit } from "@/hooks/useWeightUnit";
import { weekdayNameForDayNumber } from "@/lib/schedule";
import { useRoutineBuilderStore, type DraftValidationError } from "@/store/routineBuilderStore";
import type { DraftDay, DraftExercise } from "@/types/routine";
import type { Exercise } from "@/types/exercise";

import { WeightInput } from "@/components/ui/WeightInput";
import type { WeightUnit } from "@/lib/units";

import { ExercisePicker } from "./ExercisePicker";
import { SortableCard, SortableExercises } from "./SortableExercises";
import { describeValidationError } from "./validationMessage";

type RoutineDayEditorProps = {
  weekIdx: number;
  dayIdx: number;
  day: DraftDay;
  locale: string;
  canRemove: boolean;
  /** This day's own validation errors (already filtered by the caller), shown inline. */
  errors: DraftValidationError[];
};

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RoutineDayEditor({ weekIdx, dayIdx, day, locale, canRemove, errors }: RoutineDayEditorProps) {
  const t = useTranslations("Builder");
  const tv = useTranslations("Builder.validation");
  const unit = useWeightUnit();
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    setDayName,
    toggleRestDay,
    removeDay,
    addExercise,
    removeExercise,
    setExerciseField,
    moveExercise,
    reorderExercise,
  } = useRoutineBuilderStore();

  const weekdayName = weekdayNameForDayNumber(day.day_number, locale);
  const hasError = errors.length > 0;

  const handlePick = (exercise: Exercise) => {
    addExercise(weekIdx, dayIdx, exercise);
    setPickerOpen(false);
  };

  const handleField = (exerciseIdx: number, field: keyof DraftExercise, raw: string) => {
    const patch: Partial<DraftExercise> =
      field === "sets" || field === "rest_seconds" ? { [field]: numberOrNull(raw) } : { [field]: raw };
    setExerciseField(weekIdx, dayIdx, exerciseIdx, patch);
  };

  return (
    <section
      aria-label={weekdayName}
      className={`flex flex-col gap-2.5 ${
        hasError
          ? "rounded-[1.75rem] border border-red-400/60 bg-white/[0.065] p-4"
          : "border-t border-white/[0.13] pt-4"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-full text-lg font-extrabold ${
            day.is_rest_day ? "border border-white/15 text-white/60" : "border border-white/30 text-white"
          }`}
        >
          {day.day_number}
        </span>
        <input
          type="text"
          value={day.day_name}
          onChange={(event) => setDayName(weekIdx, dayIdx, event.target.value)}
          placeholder={t("dayNamePlaceholder")}
          disabled={day.is_rest_day}
          aria-label={t("dayNameAria", { weekday: weekdayName })}
          className="apex-input h-12 min-w-0 flex-1 rounded-2xl px-3.5 text-lg font-extrabold disabled:opacity-70"
        />
        {canRemove ? (
          <button
            type="button"
            onClick={() => removeDay(weekIdx, dayIdx)}
            aria-label={t("removeDay")}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-white/[0.22] text-white/60"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-[52px] items-center justify-between gap-3">
        <span id={`rest-${weekIdx}-${dayIdx}`} className="text-base font-semibold">
          {t("restDay")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={day.is_rest_day}
          aria-labelledby={`rest-${weekIdx}-${dayIdx}`}
          onClick={() => toggleRestDay(weekIdx, dayIdx, t("restDay"))}
          className={`relative h-9 w-16 shrink-0 rounded-full border-[1.5px] transition-colors ${
            day.is_rest_day ? "border-[#a6ff00] bg-[#a6ff00]" : "border-white/30 bg-transparent"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1/2 size-[26px] -translate-y-1/2 rounded-full transition-[left] ${
              day.is_rest_day ? "left-[calc(100%-26px-3px)] bg-black" : "left-1 bg-white/60"
            }`}
          />
        </button>
      </div>

      {hasError
        ? errors.map((error, index) => (
            <p
              key={index}
              role="alert"
              className="flex items-start gap-2 text-[15px] font-semibold leading-snug text-red-300"
            >
              <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="mt-0.5 shrink-0" />
              <span>{describeValidationError(tv, error)}</span>
            </p>
          ))
        : null}

      {!day.is_rest_day ? (
        <div className="flex flex-col gap-3">
          <SortableExercises
            count={day.exercises.length}
            onReorder={(from, to) => reorderExercise(weekIdx, dayIdx, from, to)}
          >
            {day.exercises.map((exercise, exerciseIdx) => (
              <SortableCard
                key={exerciseIdx}
                index={exerciseIdx}
                handleLabel={t("dragHandle", { name: exercise.name || t("addExercise") })}
                className="flex flex-col gap-3 rounded-2xl bg-white/[0.04] p-3.5"
              >
                {(handle) => (
                  <>
                    <div className="flex items-center gap-2">
                      {handle}
                      <input
                        value={exercise.name}
                        onChange={(event) => handleField(exerciseIdx, "name", event.target.value)}
                        placeholder="—"
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-extrabold leading-tight text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => moveExercise(weekIdx, dayIdx, exerciseIdx, "up")}
                        disabled={exerciseIdx === 0}
                        aria-label={t("moveUp", { name: exercise.name || t("addExercise") })}
                        className="grid size-11 shrink-0 place-items-center rounded-full border border-white/[0.22] text-white disabled:opacity-40"
                      >
                        <ChevronUp aria-hidden="true" size={22} strokeWidth={1.6} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExercise(weekIdx, dayIdx, exerciseIdx, "down")}
                        disabled={exerciseIdx === day.exercises.length - 1}
                        aria-label={t("moveDown", { name: exercise.name || t("addExercise") })}
                        className="grid size-11 shrink-0 place-items-center rounded-full border border-white/[0.22] text-white disabled:opacity-40"
                      >
                        <ChevronDown aria-hidden="true" size={22} strokeWidth={1.6} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExercise(weekIdx, dayIdx, exerciseIdx)}
                        aria-label={t("removeExercise", { name: exercise.name || t("addExercise") })}
                        className="grid size-11 shrink-0 place-items-center rounded-full border border-white/[0.22] text-white"
                      >
                        <Trash2 aria-hidden="true" size={20} strokeWidth={1.6} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                      <NumberField
                        label={t("sets")}
                        value={exercise.sets ?? ""}
                        onChange={(value) => handleField(exerciseIdx, "sets", value)}
                      />
                      <NumberField
                        label={t("reps")}
                        value={exercise.reps}
                        onChange={(value) => handleField(exerciseIdx, "reps", value)}
                      />
                      <WeightField
                        label={`${t("weight")} (${unit})`}
                        valueKg={exercise.weight_kg}
                        unit={unit}
                        onChangeKg={(kg) => handleField(exerciseIdx, "weight_kg", kg)}
                      />
                      <NumberField
                        label={t("rest")}
                        value={exercise.rest_seconds ?? ""}
                        onChange={(value) => handleField(exerciseIdx, "rest_seconds", value)}
                      />
                    </div>
                  </>
                )}
              </SortableCard>
            ))}
          </SortableExercises>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-[52px] items-center justify-center gap-2 rounded-[26px] border-[1.5px] border-white/30 text-base font-bold"
          >
            <Plus aria-hidden="true" size={22} strokeWidth={1.8} />
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
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-white/60">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="apex-input h-12 w-full min-w-0 rounded-2xl text-center text-lg font-bold"
      />
    </label>
  );
}

function WeightField({
  label,
  valueKg,
  unit,
  onChangeKg,
}: {
  label: string;
  valueKg: string | null;
  unit: WeightUnit;
  onChangeKg: (kg: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-white/60">{label}</span>
      <WeightInput
        valueKg={valueKg}
        unit={unit}
        onChangeKg={onChangeKg}
        className="apex-input h-12 w-full min-w-0 rounded-2xl text-center text-lg font-bold"
      />
    </label>
  );
}

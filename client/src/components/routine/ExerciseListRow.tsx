"use client";

import { Check, ChevronRight } from "lucide-react";

import type { ExerciseLog } from "@/types/progress";
import type { RoutineExercise } from "@/types/routine";

type ExerciseListRowProps = {
  exercise: RoutineExercise;
  log: ExerciseLog;
  isSelected: boolean;
  onSelect: () => void;
  /** Pre-translated, e.g. "Press de banca, 3 de 3 series". */
  ariaLabel: string;
};

/** One row in the day's exercise list: progress count, name, prescription, and a tap target that opens its sheet/panel. */
export function ExerciseListRow({ exercise, log, isSelected, onSelect, ariaLabel }: ExerciseListRowProps) {
  const doneCount = log.sets?.filter((set) => set.completed).length ?? 0;
  const totalSets = log.sets?.length ?? exercise.sets ?? 0;
  const allDone = totalSets > 0 && doneCount === totalSets;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? "true" : undefined}
      aria-label={ariaLabel}
      className={`flex w-full items-center gap-3.5 border-b border-white/10 py-3 text-left last:border-b-0 md:rounded-2xl md:border-b-0 md:px-3 md:py-3 ${
        isSelected ? "md:bg-[#a6ff00]/10" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-11 shrink-0 place-items-center rounded-full text-base font-bold ${
          allDone
            ? "bg-[#a6ff00] text-black"
            : "border-[1.5px] border-white/30 text-white"
        }`}
      >
        {allDone ? <Check size={24} strokeWidth={2.6} /> : exercise.order}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight">{exercise.name}</span>
        <span className="mt-1 block truncate text-sm font-medium text-white/60">
          {exercise.muscle_group ? `${exercise.muscle_group} · ` : ""}
          {totalSets} × {exercise.reps || "-"}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className={`text-lg font-extrabold ${allDone ? "text-[#a6ff00]" : "text-white/60"}`}>
          {doneCount}/{totalSets}
        </span>
        <ChevronRight aria-hidden="true" size={22} className="text-white/60 md:hidden" />
      </span>
    </button>
  );
}

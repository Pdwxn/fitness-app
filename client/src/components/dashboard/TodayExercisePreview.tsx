"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useFeaturedTrainingDay } from "@/hooks/useFeaturedTrainingDay";
import type { Routine } from "@/types/routine";

const PREVIEW_COUNT = 4;

type TodayExercisePreviewProps = {
  routine: Routine;
  dayHref: (dayId: string) => string;
  routineHref: string;
  labels: {
    title: string;
    viewRoutine: string;
  };
};

/** A glance at the featured day's first few exercises, with a link to the full routine for anything more. */
export function TodayExercisePreview({ routine, dayHref, routineHref, labels }: TodayExercisePreviewProps) {
  const { day } = useFeaturedTrainingDay(routine);
  if (!day || day.exercises.length === 0) return null;

  const preview = day.exercises.slice(0, PREVIEW_COUNT);

  return (
    <section aria-label={labels.title} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between">
        <h2 className="text-[22px] font-extrabold tracking-tight">{labels.title}</h2>
        <Link href={routineHref} className="flex min-h-11 items-center text-base font-bold text-[#a6ff00]">
          {labels.viewRoutine}
        </Link>
      </div>
      <ul className="border-t border-white/[0.13]">
        {preview.map((exercise, index) => (
          <li key={exercise.id} className="border-b border-white/10 last:border-b-0">
            <Link href={dayHref(day.id)} className="flex min-h-[76px] items-center gap-3.5 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 text-base font-bold">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold leading-tight">{exercise.name}</span>
                <span className="mt-1 block text-[15px] font-medium text-white/60">
                  {exercise.sets ?? "-"} × {exercise.reps || "-"}
                  {exercise.weight_kg ? ` · ${exercise.weight_kg} kg` : ""}
                </span>
              </span>
              <ChevronRight aria-hidden="true" size={22} className="shrink-0 text-white/60" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

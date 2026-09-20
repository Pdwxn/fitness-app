"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { StatusCard } from "@/components/ui/StatusCard";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import { useProgressionSuggestion } from "@/hooks/useProgression";
import type { ProgressionKind } from "@/lib/progression";
import type { RoutineExercise } from "@/types/routine";

import { DailyLogForm } from "./DailyLogForm";
import { ExerciseMedia } from "./ExerciseMedia";

/** Kinds worth showing a badge for -- "no history yet" or "off" would just be noise. */
const ACTIONABLE_KINDS: ProgressionKind[] = [
  "repeat_incomplete_sets",
  "repeat_missed_reps",
  "increase_reps",
  "increase_weight",
];

function ProgressionBadge({ exercise }: { exercise: RoutineExercise }) {
  const t = useTranslations("RoutineDay.progression");
  const suggestion = useProgressionSuggestion(exercise);

  if (!suggestion || !ACTIONABLE_KINDS.includes(suggestion.kind)) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#a6ff00]/30 bg-[#a6ff00]/10 px-4 py-3 text-sm text-[#d7ff8a]">
      <p className="text-xs font-black uppercase tracking-[0.14em]">{t("label")}</p>
      <p className="mt-1 font-bold">
        {t(`reasons.${suggestion.kind}`, suggestion.params)}
      </p>
      {suggestion.kind === "increase_weight" && suggestion.nextWeightKg != null ? (
        <p className="mt-1 text-white/70">
          {t("nextWeight", { weight: suggestion.nextWeightKg, reps: suggestion.nextReps ?? "" })}
        </p>
      ) : null}
    </div>
  );
}

type RoutineDayPageContentProps = {
  dayId: string;
  locale: string;
  labels: {
    loading: string;
    error: string;
    notFound: string;
    back: string;
    restDay: string;
    sets: string;
    reps: string;
    rest: string;
    weight: string;
    seconds: string;
    variants: string;
    tracker: {
      title: string;
      description: string;
      completedDay: string;
      dayNote: string;
      dayNotePlaceholder: string;
      exerciseCompleted: string;
      actualSets: string;
      actualReps: string;
      actualWeight: string;
      exerciseNote: string;
      exerciseNotePlaceholder: string;
      save: string;
      saving: string;
      savedLocal: string;
      synced: string;
    };
  };
};

export function RoutineDayPageContent({ dayId, locale, labels }: RoutineDayPageContentProps) {
  const { routine, isLoading, hasError } = useRoutineCache();

  const day = routine?.weeks.flatMap((week) => week.days).find((item) => item.id === dayId) ?? null;
  const estimateMinutes = day ? Math.max(30, day.exercises.length * 12) : 0;

  if (isLoading) return <StatusCard message={labels.loading} />;
  if (hasError && !routine) return <StatusCard message={labels.error} tone="error" />;
  if (!day) return <StatusCard message={labels.notFound} />;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/${locale}/routine`} className="w-fit text-sm font-black text-[#a6ff00] hover:text-white">
        {labels.back}
      </Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute right-0 top-0 size-56 rounded-full bg-[#a6ff00]/20 blur-3xl" />
        <p className="relative text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">
          {day.is_rest_day ? labels.restDay : day.day_name}
        </p>
        <h2 className="relative mt-3 text-5xl font-black tracking-tight">{day.day_name}</h2>
        <p className="relative mt-3 text-lg text-white/60">~ {estimateMinutes} min · {day.exercises.length} exercises</p>
      </section>

      {day.is_rest_day ? (
        <StatusCard message={labels.restDay} />
      ) : (
        <div className="grid gap-4">
          <DailyLogForm day={day} labels={labels.tracker} />
          {day.exercises.map((exercise) => (
            <article key={exercise.id} className="apex-card rounded-[2rem] p-6 text-white">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a6ff00]">
                    {exercise.muscle_group}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">{exercise.name}</h3>
                </div>
                <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
                  {exercise.sets ?? "-"} {labels.sets} x {exercise.reps || labels.reps}
                </p>
              </div>

              <ExerciseMedia
                name={exercise.name}
                imageUrl={exercise.image_url}
                demoUrl={exercise.video_url}
              />

              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-white/60">
                {exercise.rest_seconds ? (
                  <span className="rounded-full bg-black/35 px-3 py-1">
                    {labels.rest}: {exercise.rest_seconds} {labels.seconds}
                  </span>
                ) : null}
                {exercise.weight_kg ? (
                  <span className="rounded-full bg-black/35 px-3 py-1">
                    {labels.weight}: {exercise.weight_kg} kg
                  </span>
                ) : null}
              </div>

              <ProgressionBadge exercise={exercise} />

              {exercise.instructions ? (
                <p className="mt-4 text-sm leading-6 text-white/60">{exercise.instructions}</p>
              ) : null}

              {exercise.variants.length ? (
                <div className="mt-5">
                    <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#a6ff00]">
                    {labels.variants}
                  </h4>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {exercise.variants.map((variant) => (
                      <div key={`${exercise.id}-${variant.name}`} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                        <p className="font-black">{variant.name}</p>
                        <p className="mt-1 text-sm leading-6 text-white/60">{variant.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}



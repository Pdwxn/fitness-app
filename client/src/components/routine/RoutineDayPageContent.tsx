"use client";

import Link from "next/link";

import { useRoutineCache } from "@/hooks/useRoutineCache";

import { DailyLogForm } from "./DailyLogForm";

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

  if (isLoading) return <StatusCard message={labels.loading} />;
  if (hasError && !routine) return <StatusCard message={labels.error} tone="error" />;
  if (!day) return <StatusCard message={labels.notFound} />;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/${locale}/routine`} className="w-fit text-sm font-black text-[#8b5e34] hover:text-[#17130f]">
        {labels.back}
      </Link>

      <section className="rounded-[2rem] border border-[#ded2bf] bg-[#17130f] p-6 text-white shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#d49b50]">
          {day.is_rest_day ? labels.restDay : `${day.exercises.length} ${labels.variants.toLowerCase()}`}
        </p>
        <h2 className="mt-3 text-4xl font-black tracking-tight">{day.day_name}</h2>
      </section>

      {day.is_rest_day ? (
        <StatusCard message={labels.restDay} />
      ) : (
        <div className="grid gap-4">
          <DailyLogForm day={day} labels={labels.tracker} />
          {day.exercises.map((exercise) => (
            <article key={exercise.id} className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e34]">
                    {exercise.muscle_group}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">{exercise.name}</h3>
                </div>
                <p className="rounded-full bg-[#f7f3ec] px-4 py-2 text-sm font-black text-[#17130f]">
                  {exercise.sets ?? "-"} {labels.sets} x {exercise.reps || labels.reps}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-[#5c5349]">
                {exercise.rest_seconds ? (
                  <span className="rounded-full bg-[#f7f3ec] px-3 py-1">
                    {labels.rest}: {exercise.rest_seconds} {labels.seconds}
                  </span>
                ) : null}
                {exercise.weight_kg ? (
                  <span className="rounded-full bg-[#f7f3ec] px-3 py-1">
                    {labels.weight}: {exercise.weight_kg} kg
                  </span>
                ) : null}
              </div>

              {exercise.instructions ? (
                <p className="mt-4 text-sm leading-6 text-[#5c5349]">{exercise.instructions}</p>
              ) : null}

              {exercise.variants.length ? (
                <div className="mt-5">
                  <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[#8b5e34]">
                    {labels.variants}
                  </h4>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {exercise.variants.map((variant) => (
                      <div key={`${exercise.id}-${variant.name}`} className="rounded-3xl bg-[#f7f3ec] p-4">
                        <p className="font-black">{variant.name}</p>
                        <p className="mt-1 text-sm leading-6 text-[#5c5349]">{variant.description}</p>
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

function StatusCard({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "error" }) {
  const styles = {
    neutral: "border-[#ded2bf] bg-white/85 text-[#5c5349]",
    error: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <section className={`rounded-[2rem] border p-6 shadow-sm ${styles[tone]}`}>
      <p className="text-sm font-bold">{message}</p>
    </section>
  );
}

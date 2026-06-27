"use client";

import Link from "next/link";

import { StatusCard } from "@/components/ui/StatusCard";
import { useRoutineCache } from "@/hooks/useRoutineCache";

type RoutinePageContentProps = {
  locale: string;
  labels: {
    loading: string;
    error: string;
    empty: string;
    offlineFallback: string;
    week: string;
    restDay: string;
    exercises: string;
    viewDay: string;
  };
};

export function RoutinePageContent({ locale, labels }: RoutinePageContentProps) {
  const { routine, isLoading, hasError, isOfflineFallback } = useRoutineCache();

  if (isLoading) {
    return <StatusCard message={labels.loading} />;
  }

  if (hasError && !routine) {
    return <StatusCard message={labels.error} tone="error" />;
  }

  if (!routine) {
    return <StatusCard message={labels.empty} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {isOfflineFallback ? <StatusCard message={labels.offlineFallback} tone="warning" /> : null}

      <section className="relative overflow-hidden rounded-[2rem] pb-2 text-white">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#a6ff00]">Apex routine</p>
        <h2 className="mt-2 text-5xl font-black tracking-tight">Monthly plan</h2>
        <p className="mt-3 text-white/60">{routine.month}/{routine.year} · {routine.weeks.length} weeks</p>
      </section>

      {routine.weeks.map((week) => (
        <section key={week.id} className="apex-card rounded-[2rem] p-6 text-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a6ff00]">
                {labels.week} {week.week_number}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{week.focus}</h2>
              {week.notes ? <p className="mt-2 text-sm leading-6 text-white/60">{week.notes}</p> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {week.days.map((day) => (
              <Link
                key={day.id}
                href={`/${locale}/routine/${day.id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-[#a6ff00]/50 hover:bg-[#a6ff00]/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a6ff00]">
                      {labels.week} {week.week_number} · {day.day_number}
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-tight">{day.day_name}</h3>
                  </div>
                  <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-black text-white/65">
                    {day.is_rest_day ? labels.restDay : `${day.exercises.length} ${labels.exercises}`}
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-[#a6ff00]">{labels.viewDay} →</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}



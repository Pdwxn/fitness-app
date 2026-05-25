"use client";

import Link from "next/link";

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

      {routine.weeks.map((week) => (
        <section key={week.id} className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e34]">
                {labels.week} {week.week_number}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{week.focus}</h2>
              {week.notes ? <p className="mt-2 text-sm leading-6 text-[#5c5349]">{week.notes}</p> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {week.days.map((day) => (
              <Link
                key={day.id}
                href={`/${locale}/routine/${day.id}`}
                className="rounded-3xl bg-[#f7f3ec] p-4 transition hover:bg-[#eadfce]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b5e34]">
                      {labels.week} {week.week_number} · {day.day_number}
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-tight">{day.day_name}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#5c5349]">
                    {day.is_rest_day ? labels.restDay : `${day.exercises.length} ${labels.exercises}`}
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-[#17130f]">{labels.viewDay}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatusCard({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "warning" | "error" }) {
  const styles = {
    neutral: "border-[#ded2bf] bg-white/85 text-[#5c5349]",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <section className={`rounded-[2rem] border p-6 shadow-sm ${styles[tone]}`}>
      <p className="text-sm font-bold">{message}</p>
    </section>
  );
}

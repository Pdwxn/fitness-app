"use client";

import Link from "next/link";

import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProgressStats } from "@/hooks/useProgressStats";

type ProgressContentProps = {
  locale: string;
  labels: {
    loading: string;
    error: string;
    offlineFallback: string;
    completedDays: string;
    totalExercises: string;
    pendingSync: string;
    recentLogs: string;
    emptyLogs: string;
    completed: string;
    notCompleted: string;
    viewDay: string;
  };
};

export function ProgressContent({ locale, labels }: ProgressContentProps) {
  const {
    stats,
    isLoading: isStatsLoading,
    hasError: hasStatsError,
    isOfflineFallback: isStatsOfflineFallback,
  } = useProgressStats();
  const {
    logs,
    isLoading: areLogsLoading,
    hasError: hasLogsError,
    isOfflineFallback: areLogsOfflineFallback,
  } = useDailyLogs();
  const isLoading = isStatsLoading || areLogsLoading;
  const hasError = (hasStatsError || hasLogsError) && !stats && !logs.length;
  const isOfflineFallback = isStatsOfflineFallback || areLogsOfflineFallback;
  const recentLogs = logs.slice(0, 8);

  if (isLoading) return <StatusCard message={labels.loading} />;
  if (hasError) return <StatusCard message={labels.error} tone="error" />;

  return (
    <div className="flex flex-col gap-5">
      {isOfflineFallback ? <StatusCard message={labels.offlineFallback} tone="warning" /> : null}

      <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">{labels.completedDays}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatTile label={labels.completedDays} value={stats?.completed_days ?? 0} />
          <StatTile label={labels.totalExercises} value={stats?.total_exercises_completed ?? 0} />
          <StatTile label={labels.pendingSync} value={stats?.pending_sync ?? 0} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">{labels.recentLogs}</h2>
        {recentLogs.length ? (
          <div className="mt-5 grid gap-3">
            {recentLogs.map((log) => (
              <article key={log.id} className="rounded-3xl bg-[#f7f3ec] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b5e34]">
                      {log.date}
                    </p>
                    <p className="mt-1 font-black">
                      {log.completed ? labels.completed : labels.notCompleted}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/routine/${log.routine_day_id || log.routine_day}`}
                    className="text-sm font-black text-[#8b5e34] hover:text-[#17130f]"
                  >
                    {labels.viewDay}
                  </Link>
                </div>
                {log.day_note ? (
                  <p className="mt-3 text-sm leading-6 text-[#5c5349]">{log.day_note}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm font-bold text-[#5c5349]">{labels.emptyLogs}</p>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-[#f7f3ec] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b5e34]">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
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

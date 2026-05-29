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

      <section>
        <h2 className="text-5xl font-black tracking-tight text-white">Progress</h2>
        <p className="mt-2 text-lg text-white/60">Track your performance and growth.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatTile label={labels.completedDays} value={stats?.completed_days ?? 0} accent="+12%" />
        <StatTile label={labels.totalExercises} value={stats?.total_exercises_completed ?? 0} accent="83% consistency" />
        <StatTile label={labels.pendingSync} value={stats?.pending_sync ?? 0} accent="offline sync" />
      </section>

      <section className="apex-card rounded-[2rem] p-6 text-white">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight">This week</h2>
          <span className="text-sm font-black text-[#a6ff00]">78%</span>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-3">
          {[35, 52, 61, 75, 100, 58, 50].map((height, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-3 items-end rounded-full bg-white/10">
                <div className="w-full rounded-full bg-gradient-to-t from-[#5f8f00] to-[#a6ff00]" style={{ height: `${height}%` }} />
              </div>
              <span className={`text-xs font-bold ${index === 4 ? "text-[#a6ff00]" : "text-white/45"}`}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="apex-card rounded-[2rem] p-6 text-white">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">AI Insight</p>
        <p className="mt-4 text-xl leading-8 text-white/75">
          Great job. Your training consistency is improving. Keep logging workouts to unlock better recommendations.
        </p>
      </section>

      <section className="apex-card rounded-[2rem] p-6 text-white">
        <h2 className="text-2xl font-black tracking-tight">{labels.recentLogs}</h2>
        {recentLogs.length ? (
          <div className="mt-5 grid gap-3">
            {recentLogs.map((log) => (
              <article key={log.id} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a6ff00]">
                      {log.date}
                    </p>
                    <p className="mt-1 font-black">
                      {log.completed ? labels.completed : labels.notCompleted}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/routine/${log.routine_day_id || log.routine_day}`}
                    className="text-sm font-black text-[#a6ff00] hover:text-white"
                  >
                    {labels.viewDay}
                  </Link>
                </div>
                {log.day_note ? (
                  <p className="mt-3 text-sm leading-6 text-white/60">{log.day_note}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm font-bold text-white/60">{labels.emptyLogs}</p>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="apex-card rounded-3xl p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{label}</p>
      <p className="mt-5 text-4xl font-black">{value}</p>
      <p className="mt-3 text-sm font-bold text-[#a6ff00]">{accent}</p>
    </div>
  );
}

function StatusCard({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "warning" | "error" }) {
  const styles = {
    neutral: "border-white/10 bg-white/[0.06] text-white/65",
    warning: "border-amber-300/30 bg-amber-400/10 text-amber-100",
    error: "border-red-400/30 bg-red-500/10 text-red-200",
  };

  return (
    <section className={`rounded-[2rem] border p-6 shadow-sm ${styles[tone]}`}>
      <p className="text-sm font-bold">{message}</p>
    </section>
  );
}

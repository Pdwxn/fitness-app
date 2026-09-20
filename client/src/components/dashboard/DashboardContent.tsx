"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useQueries } from "@tanstack/react-query";

import { fetchActiveRoutine } from "@/hooks/useRoutineCache";
import { fetchProgressStats } from "@/hooks/useProgressStats";
import { queryKeys } from "@/lib/query-keys";

import { CoachProposalBanner } from "@/components/coach/CoachProposalBanner";
import { ActiveRoutineCard } from "./ActiveRoutineCard";
import { StatsPreview } from "./StatsPreview";
import { TodayExercisePreview } from "./TodayExercisePreview";

function getGreeting(greeting: { morning: string; afternoon: string; evening: string }): string {
  const hour = new Date().getHours();
  if (hour < 12) return greeting.morning;
  if (hour < 18) return greeting.afternoon;
  return greeting.evening;
}

type DashboardContentProps = {
  locale: string;
  labels: {
    loading: string;
    error: string;
    onboardingRequired: {
      eyebrow: string;
      title: string;
      description: string;
      cta: string;
    };
    routinePending: {
      eyebrow: string;
      title: string;
      description: string;
      badges: [string, string, string];
      cta: string;
      generating: string;
      error: string;
      retry: string;
    };
    stats: {
      title: string;
      completedDays: string;
      totalExercises: string;
      activeRoutine: string;
      lastSync: string;
      pending: string;
      never: string;
    };
    greeting: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    athlete: string;
    dayStreak: string;
    activeRoutine: {
      upNext: string;
      startWorkout: string;
      exercises: string;
      title: string;
      eyebrow: string;
    };
    todayPreview: {
      title: string;
      viewRoutine: string;
    };
    routineStates: {
      loading: string;
      error: string;
      offlineFallback: string;
    };
    noRoutine: {
      title: string;
      description: string;
      cta: string;
    };
  };
};

function formatLastSync(timestamp: number | null) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function DashboardContent({ locale, labels }: DashboardContentProps) {
  const [
    { data: routine, isLoading: rtLoading, isError: rtError, dataUpdatedAt: lastSync },
    { data: statsData },
  ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.routine.active(),
        queryFn: fetchActiveRoutine,
        staleTime: 60_000,
        retry: false,
      },
      {
        queryKey: queryKeys.progress.stats(),
        queryFn: fetchProgressStats,
        staleTime: 30_000,
      },
    ],
  });

  const hasRoutineError = rtError && !routine;
  const isOfflineFallback = rtError && Boolean(routine);
  const stats = statsData ?? null;

  const activeRoutine = useMemo(() => {
    if (!routine) return labels.stats.pending;
    if (routine.source === "manual" || !routine.month || !routine.year) {
      return labels.activeRoutine.eyebrow;
    }
    return `${routine.month}/${routine.year}`;
  }, [routine, labels.stats.pending, labels.activeRoutine.eyebrow]);
  const completedDays = stats?.completed_days ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-base text-white/60">
            {getGreeting(labels.greeting)}, <span className="font-black text-white">{labels.athlete}</span>
          </p>
          <p className="mt-1 text-sm font-bold text-white/50">
            🔥 {Math.max(1, completedDays)} {labels.dayStreak}
          </p>
        </div>
      </div>

      {isOfflineFallback ? (
        <section className="rounded-[2rem] border border-amber-300/30 bg-amber-400/10 p-4 shadow-sm">
          <p className="text-sm font-bold text-amber-100">{labels.routineStates.offlineFallback}</p>
        </section>
      ) : null}

      {hasRoutineError ? (
        <section className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 shadow-sm">
          <p className="text-sm font-bold text-red-200">{labels.routineStates.error}</p>
        </section>
      ) : null}

      {rtLoading ? (
        <section className="apex-card rounded-[2rem] p-6">
          <p className="text-sm font-bold text-white/65">{labels.routineStates.loading}</p>
        </section>
      ) : null}

      {!rtLoading && !routine && !hasRoutineError ? (
        <section className="apex-card flex flex-col items-start gap-4 rounded-[2rem] p-6 text-white">
          <span className="grid size-14 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/10 text-[#a6ff00]">
            <ClipboardList aria-hidden="true" size={26} strokeWidth={1.6} />
          </span>
          <div>
            <p className="text-xl font-black tracking-tight">{labels.noRoutine.title}</p>
            <p className="mt-1 text-sm leading-6 text-white/60">{labels.noRoutine.description}</p>
          </div>
          <Link href={`/${locale}/routine`} className="apex-button rounded-2xl px-5 py-3 text-sm font-black">
            {labels.noRoutine.cta}
          </Link>
        </section>
      ) : null}

      {routine ? (
        <>
          <CoachProposalBanner locale={locale} />
          <ActiveRoutineCard
            routine={routine}
            href={`/${locale}/routine`}
            dayHref={(dayId) => `/${locale}/routine/${dayId}`}
            labels={labels.activeRoutine}
          />
          <TodayExercisePreview
            routine={routine}
            dayHref={(dayId) => `/${locale}/routine/${dayId}`}
            routineHref={`/${locale}/routine`}
            labels={labels.todayPreview}
          />
        </>
      ) : null}

      <StatsPreview
        labels={labels.stats}
        completedDays={stats?.completed_days ?? 0}
        totalExercises={stats?.total_exercises_completed ?? 0}
        activeRoutine={activeRoutine}
        lastSync={formatLastSync(lastSync)}
      />
    </div>
  );
}

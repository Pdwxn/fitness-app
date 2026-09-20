"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueries } from "@tanstack/react-query";

import { fetchActiveRoutine } from "@/hooks/useRoutineCache";
import { fetchProgressStats } from "@/hooks/useProgressStats";
import { usePendingRoutine } from "@/hooks/usePendingRoutine";
import { queryKeys } from "@/lib/query-keys";

import { CoachProposalBanner } from "@/components/coach/CoachProposalBanner";
import { ChangeRoutineButton } from "@/components/routine/ChangeRoutineButton";
import { RoutineChoiceScreen } from "@/components/routine/RoutineChoiceScreen";
import { ActiveRoutineCard } from "./ActiveRoutineCard";
import { StatsPreview } from "./StatsPreview";
import { WeeklyRoutinePreview } from "./WeeklyRoutinePreview";

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
      eyebrow: string;
      upNext: string;
      startWorkout: string;
      exercises: string;
      title: string;
      description: string;
      cta: string;
      weeks: string;
      activeDays: string;
      nextWorkout: string;
      restDay: string;
    };
    weeklyPreview: {
      title: string;
      week: string;
      restDay: string;
      exercises: string;
      selectedDay: {
        title: string;
        restDay: string;
        sets: string;
        reps: string;
        rest: string;
        weight: string;
        seconds: string;
        empty: string;
      };
    };
    routineStates: {
      loading: string;
      error: string;
      offlineFallback: string;
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
  const tBuilder = useTranslations("Builder");
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
  const { hasPending, isLoading: pendingLoading } = usePendingRoutine();

  const isRoutineLoading = rtLoading || pendingLoading;
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

  if (!isRoutineLoading && !routine && !hasPending) {
    return <RoutineChoiceScreen locale={locale} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-[2rem] p-1">
        <div className="pointer-events-none absolute right-0 top-0 size-44 rounded-full bg-[#a6ff00]/20 blur-3xl" />
        <p className="text-xl text-white/70">{getGreeting(labels.greeting)},</p>
        <h2 className="mt-1 text-6xl font-black tracking-tight text-[#a6ff00]">{labels.athlete} 👋</h2>
        <p className="mt-3 text-lg font-bold text-white/65">🔥 {Math.max(1, completedDays)} {labels.dayStreak}</p>
      </section>

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

      {isRoutineLoading ? (
        <section className="apex-card rounded-[2rem] p-6">
          <p className="text-sm font-bold text-white/65">{labels.routineStates.loading}</p>
        </section>
      ) : null}

      {!isRoutineLoading && !routine && hasPending ? (
        <RoutineChoiceScreen locale={locale} hasPending />
      ) : null}

      {routine ? (
        <>
          <CoachProposalBanner locale={locale} />
          <div className="flex items-center justify-end gap-3">
            {routine.source === "manual" ? (
              <Link
                href={`/${locale}/routine/builder?mode=edit`}
                className="apex-button-outline rounded-xl px-4 py-2 text-xs font-black"
              >
                {tBuilder("editEntryCta")}
              </Link>
            ) : null}
            <ChangeRoutineButton routineId={routine.id} />
          </div>
          <ActiveRoutineCard
            routine={routine}
            href={`/${locale}/routine`}
            dayHref={(dayId) => `/${locale}/routine/${dayId}`}
            labels={labels.activeRoutine}
          />
          <WeeklyRoutinePreview
            routine={routine}
            dayHref={(dayId) => `/${locale}/routine/${dayId}`}
            labels={labels.weeklyPreview}
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

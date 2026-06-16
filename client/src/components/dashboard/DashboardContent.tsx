"use client";

import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useProgressStats } from "@/hooks/useProgressStats";
import { useRoutineCache } from "@/hooks/useRoutineCache";

import { ActiveRoutineCard } from "./ActiveRoutineCard";
import { OnboardingRequiredCard } from "./OnboardingRequiredCard";
import { RoutinePendingCard } from "./RoutinePendingCard";
import { StatsPreview } from "./StatsPreview";
import { WeeklyRoutinePreview } from "./WeeklyRoutinePreview";

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
    activeRoutine: {
      eyebrow: string;
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
  const { isLoading, hasError, isComplete } = useOnboardingStatus();
  const {
    routine,
    lastSync,
    isLoading: isRoutineLoading,
    hasError: hasRoutineError,
    isOfflineFallback,
    refreshRoutine,
  } = useRoutineCache();
  const { stats } = useProgressStats();
  const activeRoutine = routine ? `${routine.month}/${routine.year}` : labels.stats.pending;
  const completedDays = stats?.completed_days ?? 0;

  if (isLoading) {
    return (
      <section className="apex-card rounded-[2rem] p-6">
        <p className="text-sm font-bold text-white/65">{labels.loading}</p>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 shadow-sm">
        <p className="text-sm font-bold text-red-200">{labels.error}</p>
      </section>
    );
  }

  if (!isComplete) {
    return (
      <OnboardingRequiredCard
        href={`/${locale}/onboarding`}
        eyebrow={labels.onboardingRequired.eyebrow}
        title={labels.onboardingRequired.title}
        description={labels.onboardingRequired.description}
        cta={labels.onboardingRequired.cta}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-[2rem] p-1">
        <div className="pointer-events-none absolute right-0 top-0 size-44 rounded-full bg-[#a6ff00]/20 blur-3xl" />
        <p className="text-xl text-white/70">Good evening,</p>
        <h2 className="mt-1 text-6xl font-black tracking-tight text-[#a6ff00]">Apex athlete 👋</h2>
        <p className="mt-3 text-lg font-bold text-white/65">🔥 {Math.max(1, completedDays)} day streak</p>
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

      {!isRoutineLoading && !routine ? <RoutinePendingCard {...labels.routinePending} onRoutineGenerated={refreshRoutine} /> : null}

      {routine ? (
        <>
          <ActiveRoutineCard
            routine={routine}
            href={`/${locale}/routine`}
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

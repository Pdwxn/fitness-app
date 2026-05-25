"use client";

import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
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
      cta: string;
      badges: [string, string, string];
    };
    stats: {
      title: string;
      completedDays: string;
      streak: string;
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
    stats,
    lastSync,
    isLoading: isRoutineLoading,
    hasError: hasRoutineError,
    isOfflineFallback,
  } = useRoutineCache();
  const activeRoutine = routine ? `${routine.month}/${routine.year}` : labels.stats.pending;

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <p className="text-sm font-bold text-[#5c5349]">{labels.loading}</p>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="rounded-[2rem] border border-red-100 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-bold text-red-700">{labels.error}</p>
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
      {isOfflineFallback ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-amber-800">{labels.routineStates.offlineFallback}</p>
        </section>
      ) : null}

      {hasRoutineError ? (
        <section className="rounded-[2rem] border border-red-100 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-bold text-red-700">{labels.routineStates.error}</p>
        </section>
      ) : null}

      {isRoutineLoading ? (
        <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
          <p className="text-sm font-bold text-[#5c5349]">{labels.routineStates.loading}</p>
        </section>
      ) : null}

      {!isRoutineLoading && !routine ? <RoutinePendingCard {...labels.routinePending} /> : null}

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
        streak={0}
        activeRoutine={activeRoutine}
        lastSync={formatLastSync(lastSync)}
      />
    </div>
  );
}

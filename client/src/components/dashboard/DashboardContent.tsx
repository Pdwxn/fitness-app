"use client";

import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useRoutineCache } from "@/hooks/useRoutineCache";

import { OnboardingRequiredCard } from "./OnboardingRequiredCard";
import { RoutinePendingCard } from "./RoutinePendingCard";
import { StatsPreview } from "./StatsPreview";

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
  const { routine, stats, lastSync } = useRoutineCache();
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
      <RoutinePendingCard {...labels.routinePending} />
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

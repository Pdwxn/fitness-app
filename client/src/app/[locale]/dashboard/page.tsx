import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  return (
    <AppShell locale={locale} title={t("title")} description={t("description")}>
      <DashboardContent
        locale={locale}
        labels={{
          loading: t("states.loading"),
          error: t("states.error"),
          onboardingRequired: {
            eyebrow: t("onboardingRequired.eyebrow"),
            title: t("onboardingRequired.title"),
            description: t("onboardingRequired.description"),
            cta: t("onboardingRequired.cta"),
          },
          routinePending: {
            eyebrow: t("routinePending.eyebrow"),
            title: t("routinePending.title"),
            description: t("routinePending.description"),
            badges: [
              t("routinePending.badges.duration"),
              t("routinePending.badges.ai"),
              t("routinePending.badges.offline"),
            ],
            cta: t("routinePending.cta"),
            generating: t("routinePending.generating"),
            error: t("routinePending.error"),
            retry: t("routinePending.retry"),
          },
          stats: {
            title: t("stats.title"),
            completedDays: t("stats.completedDays"),
            totalExercises: t("stats.totalExercises"),
            activeRoutine: t("stats.activeRoutine"),
            lastSync: t("stats.lastSync"),
            pending: t("stats.pending"),
            never: t("stats.never"),
          },
          activeRoutine: {
            eyebrow: t("activeRoutine.eyebrow"),
            title: t("activeRoutine.title"),
            description: t("activeRoutine.description"),
            cta: t("activeRoutine.cta"),
            weeks: t("activeRoutine.weeks"),
            activeDays: t("activeRoutine.activeDays"),
            nextWorkout: t("activeRoutine.nextWorkout"),
            restDay: t("activeRoutine.restDay"),
          },
          weeklyPreview: {
            title: t("weeklyPreview.title"),
            week: t("weeklyPreview.week"),
            restDay: t("weeklyPreview.restDay"),
            exercises: t("weeklyPreview.exercises"),
            selectedDay: {
              title: t("weeklyPreview.selectedDay.title"),
              restDay: t("weeklyPreview.selectedDay.restDay"),
              sets: t("weeklyPreview.selectedDay.sets"),
              reps: t("weeklyPreview.selectedDay.reps"),
              rest: t("weeklyPreview.selectedDay.rest"),
              weight: t("weeklyPreview.selectedDay.weight"),
              seconds: t("weeklyPreview.selectedDay.seconds"),
              empty: t("weeklyPreview.selectedDay.empty"),
            },
          },
          routineStates: {
            loading: t("routineStates.loading"),
            error: t("routineStates.error"),
            offlineFallback: t("routineStates.offlineFallback"),
          },
        }}
      />
    </AppShell>
  );
}

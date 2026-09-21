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
    <AppShell locale={locale} title={t("title")} description={t("description")} hideHeader>
      <DashboardContent
        locale={locale}
        labels={{
          loading: t("states.loading"),
          error: t("states.error"),
          stats: {
            title: t("stats.title"),
            completedDays: t("stats.completedDays"),
            totalExercises: t("stats.totalExercises"),
            activeRoutine: t("stats.activeRoutine"),
            lastSync: t("stats.lastSync"),
            pending: t("stats.pending"),
            never: t("stats.never"),
          },
          greeting: {
            morning: t("greeting.morning"),
            afternoon: t("greeting.afternoon"),
            evening: t("greeting.evening"),
          },
          athlete: t("athlete"),
          dayStreak: t("dayStreak"),
          activeRoutine: {
            eyebrow: t("activeRoutine.eyebrow"),
            upNext: t("activeRoutine.upNext"),
            startWorkout: t("activeRoutine.startWorkout"),
            exercises: t("activeRoutine.exercises"),
            title: t("activeRoutine.title"),
          },
          todayPreview: {
            title: t("todayPreview.title"),
            viewRoutine: t("todayPreview.viewRoutine"),
          },
          routineStates: {
            loading: t("routineStates.loading"),
            error: t("routineStates.error"),
            offlineFallback: t("routineStates.offlineFallback"),
          },
          noRoutine: {
            title: t("noRoutine.title"),
            description: t("noRoutine.description"),
            cta: t("noRoutine.cta"),
          },
        }}
      />
    </AppShell>
  );
}

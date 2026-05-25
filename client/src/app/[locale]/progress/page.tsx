import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { ProgressContent } from "@/components/progress/ProgressContent";

export default async function ProgressPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Progress");

  return (
    <AppShell locale={locale} title={t("title")} description={t("description")}>
      <ProgressContent
        locale={locale}
        labels={{
          loading: t("states.loading"),
          error: t("states.error"),
          offlineFallback: t("states.offlineFallback"),
          completedDays: t("stats.completedDays"),
          totalExercises: t("stats.totalExercises"),
          pendingSync: t("stats.pendingSync"),
          recentLogs: t("recentLogs"),
          emptyLogs: t("emptyLogs"),
          completed: t("completed"),
          notCompleted: t("notCompleted"),
          viewDay: t("viewDay"),
        }}
      />
    </AppShell>
  );
}

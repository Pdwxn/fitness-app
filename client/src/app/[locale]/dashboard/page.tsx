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
            cta: t("routinePending.cta"),
          },
          stats: {
            title: t("stats.title"),
            completedDays: t("stats.completedDays"),
            streak: t("stats.streak"),
            activeRoutine: t("stats.activeRoutine"),
            lastSync: t("stats.lastSync"),
            pending: t("stats.pending"),
            never: t("stats.never"),
          },
        }}
      />
    </AppShell>
  );
}

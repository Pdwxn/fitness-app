import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { RoutineBuilderWizard } from "@/components/routine/builder/RoutineBuilderWizard";

export default async function RoutineBuilderPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Builder");

  return (
    <AppShell locale={locale} title={t("title")} description={t("description")}>
      <RoutineBuilderWizard locale={locale} />
    </AppShell>
  );
}

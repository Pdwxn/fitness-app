import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { RoutineBuilderWizard } from "@/components/routine/builder/RoutineBuilderWizard";

export default async function RoutineBuilderPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}>) {
  const { locale } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = modeParam === "edit" ? "edit" : "create";
  setRequestLocale(locale);
  const t = await getTranslations("Builder");

  return (
    <AppShell
      locale={locale}
      title={mode === "edit" ? t("editTitle") : t("title")}
      description={mode === "edit" ? t("editDescription") : t("description")}
      hideHeader
    >
      <RoutineBuilderWizard locale={locale} mode={mode} />
    </AppShell>
  );
}

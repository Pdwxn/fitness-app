import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { RoutinePageContent } from "@/components/routine/RoutinePageContent";

export default async function RoutinePage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Routine");

  return (
    <AppShell locale={locale} title={t("title")} description={t("description")} hideHeader>
      <RoutinePageContent locale={locale} />
    </AppShell>
  );
}

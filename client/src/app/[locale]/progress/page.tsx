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
    <AppShell locale={locale} title={t("title")} description={t("description")} hideHeader>
      <ProgressContent locale={locale} />
    </AppShell>
  );
}

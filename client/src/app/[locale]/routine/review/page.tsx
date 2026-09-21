import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { CoachReviewContent } from "@/components/coach/CoachReviewContent";

export default async function CoachReviewPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Coach");

  return (
    <AppShell locale={locale} title={t("reviewTitle")} description={t("reviewDescription")} hideHeader>
      <CoachReviewContent locale={locale} />
    </AppShell>
  );
}

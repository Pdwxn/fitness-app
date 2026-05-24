import { getTranslations, setRequestLocale } from "next-intl/server";

import { PlaceholderCard } from "@/components/dashboard/PlaceholderCard";
import { AppShell } from "@/components/layout/AppShell";

export default async function ProfilePage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  return (
    <AppShell locale={locale} title={t("title")} description={t("description")}>
      <PlaceholderCard eyebrow={t("eyebrow")} title={t("cardTitle")} description={t("cardDescription")} />
    </AppShell>
  );
}

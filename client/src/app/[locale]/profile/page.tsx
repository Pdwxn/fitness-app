import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { ProfileContent } from "@/components/profile/ProfileContent";

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
      <ProfileContent locale={locale} />
    </AppShell>
  );
}

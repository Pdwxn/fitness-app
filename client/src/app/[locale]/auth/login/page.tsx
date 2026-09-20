import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.login");

  return (
    <AuthShell title={t("title")} description={t("description")}>
      <LoginForm locale={locale} />
    </AuthShell>
  );
}

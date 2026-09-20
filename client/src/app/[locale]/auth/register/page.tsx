import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.register");

  return (
    <AuthShell title={t("title")}>
      <RegisterForm locale={locale} />
    </AuthShell>
  );
}

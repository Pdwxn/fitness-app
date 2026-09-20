import { setRequestLocale } from "next-intl/server";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OnboardingForm locale={locale} />;
}

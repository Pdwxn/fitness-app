import { getTranslations, setRequestLocale } from "next-intl/server";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Onboarding");

  return (
    <OnboardingForm
      labels={{
        title: t("title"),
        description: t("description"),
        next: t("actions.next"),
        previous: t("actions.previous"),
        finish: t("actions.finish"),
        draftLoaded: t("draftLoaded"),
        steps: [
          t("steps.personal"),
          t("steps.activity"),
          t("steps.goals"),
          t("steps.health"),
          t("steps.equipment"),
          t("steps.routine"),
        ],
        placeholders: [
          t("placeholders.personal"),
          t("placeholders.activity"),
          t("placeholders.goals"),
          t("placeholders.health"),
          t("placeholders.equipment"),
          t("placeholders.routine"),
        ],
      }}
    />
  );
}

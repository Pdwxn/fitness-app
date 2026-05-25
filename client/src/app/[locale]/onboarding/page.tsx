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
      locale={locale}
      labels={{
        title: t("title"),
        description: t("description"),
        next: t("actions.next"),
        previous: t("actions.previous"),
        finish: t("actions.finish"),
        draftLoaded: t("draftLoaded"),
        validationError: t("validationError"),
        submitError: t("submitError"),
        completedTitle: t("completed.title"),
        completedDescription: t("completed.description"),
        backHome: t("completed.backHome"),
        loadingStatus: t("loadingStatus"),
        submitting: t("actions.submitting"),
        generating: t("actions.generating"),
        generationFailedTitle: t("generationFailed.title"),
        generationFailedDescription: t("generationFailed.description"),
        goToDashboard: t("generationFailed.goToDashboard"),
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

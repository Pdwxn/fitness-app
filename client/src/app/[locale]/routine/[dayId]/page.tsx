import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { RoutineDayPageContent } from "@/components/routine/RoutineDayPageContent";

export default async function RoutineDayPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string; dayId: string }>;
}>) {
  const { locale, dayId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RoutineDay");

  return (
    <AppShell locale={locale} title={t("title")} description={t("description")}>
      <RoutineDayPageContent
        dayId={dayId}
        locale={locale}
        labels={{
          loading: t("states.loading"),
          error: t("states.error"),
          notFound: t("states.notFound"),
          back: t("back"),
          restDay: t("restDay"),
          sets: t("sets"),
          reps: t("reps"),
          rest: t("rest"),
          weight: t("weight"),
          seconds: t("seconds"),
          variants: t("variants"),
        }}
      />
    </AppShell>
  );
}

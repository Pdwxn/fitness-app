"use client";

import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/ui/states";

export function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("States");
  console.error("[RouteErrorBoundary]", error);

  return (
    <main className="apex-bg flex min-h-screen items-center px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ErrorState
          title={t("crashTitle")}
          description={t("crashDescription")}
          actionLabel={t("retry")}
          onAction={reset}
        />
      </div>
    </main>
  );
}

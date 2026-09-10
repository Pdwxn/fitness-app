"use client";

import { RouteErrorFallback } from "@/components/RouteErrorBoundary";

export default function RoutineBuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} />;
}

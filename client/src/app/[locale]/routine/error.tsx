"use client";

import { RouteErrorFallback } from "@/components/RouteErrorBoundary";

export default function RoutineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} />;
}

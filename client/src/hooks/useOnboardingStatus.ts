import { useEffect, useState } from "react";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";

type OnboardingStatusResponse = {
  completed: boolean;
};

export function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    authenticatedClientFetch<OnboardingStatusResponse>("/api/v1/onboarding/status/")
      .then((response) => {
        if (cancelled) return;
        setIsComplete(response.completed);
        setHasError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isLoading, hasError, isComplete };
}

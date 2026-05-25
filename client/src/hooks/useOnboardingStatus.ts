import { useEffect, useState } from "react";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type { RoutineCache } from "@/types/routine";

type OnboardingStatusResponse = {
  completed: boolean;
};

export function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cachedStatus = getFromStorage<OnboardingStatusResponse>(STORAGE_KEYS.ONBOARDING_STATUS);
    const cachedRoutine = getFromStorage<RoutineCache>(STORAGE_KEYS.ROUTINE);

    if (cachedStatus || cachedRoutine) {
      setIsComplete(cachedStatus?.completed ?? Boolean(cachedRoutine));
      setIsLoading(false);
    }

    authenticatedClientFetch<OnboardingStatusResponse>("/api/v1/onboarding/status/")
      .then((response) => {
        if (cancelled) return;
        setIsComplete(response.completed);
        setHasError(false);
        setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, response);
      })
      .catch(() => {
        if (cancelled) return;
        if (cachedStatus || cachedRoutine) {
          setIsComplete(cachedStatus?.completed ?? true);
          setHasError(false);
          return;
        }
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

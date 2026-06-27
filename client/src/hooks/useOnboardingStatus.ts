import { useQuery } from "@tanstack/react-query";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { queryKeys } from "@/lib/query-keys";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";

type OnboardingStatusResponse = {
  completed: boolean;
};

export async function fetchOnboardingStatus(): Promise<OnboardingStatusResponse> {
  const response = await authenticatedClientFetch<OnboardingStatusResponse>("/api/v1/onboarding/status/");
  setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, response);
  return response;
}

export function useOnboardingStatus() {
  const { data, isLoading, isError } = useQuery<OnboardingStatusResponse>({
    queryKey: queryKeys.onboarding.status(),
    queryFn: fetchOnboardingStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const cachedStatus = getFromStorage<OnboardingStatusResponse>(STORAGE_KEYS.ONBOARDING_STATUS);
  const isComplete = data?.completed ?? cachedStatus?.completed ?? false;
  const hasError = isError && !cachedStatus;

  return { isLoading, hasError, isComplete };
}

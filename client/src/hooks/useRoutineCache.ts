import { useQuery } from "@tanstack/react-query";

import { ApiError, authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { queryKeys } from "@/lib/query-keys";
import { removeFromStorage, STORAGE_KEYS } from "@/lib/storage";
import type { RoutineCache } from "@/types/routine";

export function useRoutineCache() {
  const { data, isLoading, isError, dataUpdatedAt, refetch } = useQuery<RoutineCache | null>({
    queryKey: queryKeys.routine.active(),
    queryFn: async () => {
      try {
        return await authenticatedClientFetch<RoutineCache>("/api/v1/routines/active/");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          removeFromStorage(STORAGE_KEYS.ROUTINE);
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const routine = data ?? null;
  const hasError = isError && !routine;
  const isOfflineFallback = isError && Boolean(routine);

  return {
    routine,
    lastSync: dataUpdatedAt,
    isLoading,
    hasError,
    isOfflineFallback,
    refreshRoutine: refetch,
  };
}

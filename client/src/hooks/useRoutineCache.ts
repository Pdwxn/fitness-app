import { useQuery } from "@tanstack/react-query";

import { ApiError, authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { db } from "@/lib/db";
import { queryKeys } from "@/lib/query-keys";
import type { RoutineCache } from "@/types/routine";

export async function fetchActiveRoutine(): Promise<RoutineCache | null> {
  try {
    const routine = await authenticatedClientFetch<RoutineCache>("/api/v1/routines/active/");
    await db.routineCache.put(routine);
    return routine;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await db.routineCache.clear();
      return null;
    }
    throw error;
  }
}

export function useRoutineCache() {
  const { data, isLoading, isError, dataUpdatedAt, refetch } = useQuery<RoutineCache | null>({
    queryKey: queryKeys.routine.active(),
    queryFn: fetchActiveRoutine,
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

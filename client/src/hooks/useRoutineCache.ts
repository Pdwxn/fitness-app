import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";

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
    // Consumers surface this through `hasError` / `isOfflineFallback` in the UI.
    console.error("[useRoutineCache]", error);
    throw error;
  }
}

/**
 * The active routine, offline first. The local copy (Dexie) is read at once and
 * shown, so it appears on cold start, offline, or on a slow network; the server
 * answer then replaces it when it arrives. A successful server answer is the
 * source of truth, including "no routine" (null).
 */
export function useRoutineCache() {
  // undefined while Dexie is still answering, null when nothing is stored.
  const local = useLiveQuery<RoutineCache | null>(
    async () => (await db.routineCache.toArray())[0] ?? null,
    [],
  );
  const remote = useQuery<RoutineCache | null>({
    queryKey: queryKeys.routine.active(),
    queryFn: fetchActiveRoutine,
    staleTime: 60_000,
    retry: false,
  });

  const serverRoutine = remote.isError ? undefined : remote.data;
  const routine = (serverRoutine !== undefined ? serverRoutine : local) ?? null;
  const settledRemotely = remote.isSuccess || remote.isError;
  const hasError = remote.isError && local !== undefined && !routine;
  const isOfflineFallback = remote.isError && Boolean(routine);

  return {
    routine,
    lastSync: remote.dataUpdatedAt,
    isLoading: !routine && !settledRemotely,
    hasError,
    isOfflineFallback,
    refreshRoutine: remote.refetch,
  };
}

import { useEffect, useState } from "react";

import { ApiError, authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getFromStorage, removeFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type { ProgressStats } from "@/types/progress";
import type { RoutineCache } from "@/types/routine";

export function useRoutineCache() {
  const [routine, setRoutine] = useState<RoutineCache | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const cachedRoutine = getFromStorage<RoutineCache>(STORAGE_KEYS.ROUTINE);
    const cachedStats = getFromStorage<ProgressStats>(STORAGE_KEYS.STATS);
    const cachedLastSync = getFromStorage<number>(STORAGE_KEYS.LAST_SYNC);

    setRoutine(cachedRoutine);
    setStats(cachedStats);
    setLastSync(cachedLastSync);
    setHasError(false);
    setIsOfflineFallback(false);
    setIsLoading(!cachedRoutine);

    async function loadRoutine() {
      try {
        const freshRoutine = await authenticatedClientFetch<RoutineCache>("/api/v1/routines/active/");
        if (isCancelled) return;

        const syncedAt = Date.now();
        setRoutine(freshRoutine);
        setLastSync(syncedAt);
        setInStorage(STORAGE_KEYS.ROUTINE, freshRoutine);
        setInStorage(STORAGE_KEYS.LAST_SYNC, syncedAt);
      } catch (error) {
        if (isCancelled) return;

        if (error instanceof ApiError && error.status === 404) {
          setRoutine(null);
          setHasError(false);
          removeFromStorage(STORAGE_KEYS.ROUTINE);
          return;
        }

        setHasError(!cachedRoutine);
        setIsOfflineFallback(Boolean(cachedRoutine));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRoutine();

    return () => {
      isCancelled = true;
    };
  }, [refreshIndex]);

  function refreshRoutine() {
    setRefreshIndex((current) => current + 1);
  }

  return { routine, stats, lastSync, isLoading, hasError, isOfflineFallback, refreshRoutine };
}

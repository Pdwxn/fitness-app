import { useEffect, useState } from "react";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { calculateStats, getLocalLogs, getPendingLogs } from "@/lib/sync";
import type { ProgressStats } from "@/types/progress";

export function useProgressStats() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cachedStats = getFromStorage<ProgressStats>(STORAGE_KEYS.STATS);
    const localStats = cachedStats ?? calculateStats(getLocalLogs(), getPendingLogs().length);

    setStats(localStats);
    setIsLoading(!localStats);
    setHasError(false);
    setIsOfflineFallback(false);

    async function loadStats() {
      try {
        const remoteStats = await authenticatedClientFetch<ProgressStats>("/api/v1/progress/stats/");
        if (cancelled) return;

        const withPending = { ...remoteStats, pending_sync: getPendingLogs().length };
        setStats(withPending);
        setInStorage(STORAGE_KEYS.STATS, withPending);
      } catch {
        if (cancelled) return;
        setHasError(!localStats);
        setIsOfflineFallback(Boolean(localStats));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, isLoading, hasError, isOfflineFallback };
}

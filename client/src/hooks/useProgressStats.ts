import { useQuery } from "@tanstack/react-query";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { queryKeys } from "@/lib/query-keys";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { calculateStats, getLocalLogs, getPendingLogs } from "@/lib/sync";
import type { ProgressStats } from "@/types/progress";

export function useProgressStats() {
  const { data, isLoading, isError } = useQuery<ProgressStats>({
    queryKey: queryKeys.progress.stats(),
    queryFn: async () => {
      const remoteStats = await authenticatedClientFetch<ProgressStats>("/api/v1/progress/stats/");
      const withPending = { ...remoteStats, pending_sync: getPendingLogs().length };
      setInStorage(STORAGE_KEYS.STATS, withPending);
      return withPending;
    },
    staleTime: 30_000,
  });

  const cachedStats = getFromStorage<ProgressStats>(STORAGE_KEYS.STATS);
  const localStats = cachedStats ?? calculateStats(getLocalLogs(), getPendingLogs().length);
  const stats = data ?? localStats;
  const hasError = isError && !localStats;
  const isOfflineFallback = isError && Boolean(localStats);

  return { stats, isLoading, hasError, isOfflineFallback };
}

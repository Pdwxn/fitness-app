import { useQuery } from "@tanstack/react-query";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { db, type StatsEntry } from "@/lib/db";
import { queryKeys } from "@/lib/query-keys";
import { getPendingLogs } from "@/lib/sync";
import type { ProgressStats } from "@/types/progress";

export function useProgressStats() {
  const { data, isLoading, isError } = useQuery<ProgressStats>({
    queryKey: queryKeys.progress.stats(),
    queryFn: async () => {
      const remoteStats = await authenticatedClientFetch<ProgressStats>("/api/v1/progress/stats/");
      const pendingLogs = await getPendingLogs();
      const withPending = { ...remoteStats, pending_sync: pendingLogs.length };
      const entry: StatsEntry = { id: "progress", ...withPending };
      await db.stats.put(entry);
      return withPending;
    },
    staleTime: 30_000,
  });

  const stats = data ?? null;
  const hasError = isError && !stats;
  const isOfflineFallback = isError && Boolean(stats);

  return { stats, isLoading, hasError, isOfflineFallback };
}

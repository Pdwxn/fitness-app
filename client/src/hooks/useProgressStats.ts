import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { db, type StatsEntry } from "@/lib/db";
import { queryKeys } from "@/lib/query-keys";
import { getPendingLogs } from "@/lib/sync";
import type { ProgressStats } from "@/types/progress";

export async function fetchProgressStats(): Promise<ProgressStats> {
  const remoteStats = await authenticatedClientFetch<ProgressStats>("/api/v1/progress/stats/");
  const pendingLogs = await getPendingLogs();
  const withPending = { ...remoteStats, pending_sync: pendingLogs.length };
  const entry: StatsEntry = { id: "progress", ...withPending };
  await db.stats.put(entry);
  return withPending;
}

/**
 * Progress totals, offline first. The copy kept in Dexie (also refreshed every
 * time logs are merged or a log is saved) is read at once and shown, so the
 * numbers appear on cold start, offline, or on a slow network; the server
 * answer then replaces it.
 */
export function useProgressStats() {
  // undefined while Dexie is still answering, null when nothing is stored.
  const local = useLiveQuery<ProgressStats | null>(async () => {
    const entry = await db.stats.get("progress");
    if (!entry) return null;
    return {
      completed_days: entry.completed_days,
      total_exercises_completed: entry.total_exercises_completed,
      pending_sync: entry.pending_sync,
    };
  }, []);

  const remote = useQuery<ProgressStats>({
    queryKey: queryKeys.progress.stats(),
    queryFn: fetchProgressStats,
    staleTime: 30_000,
  });

  const serverStats = remote.isError ? undefined : remote.data;
  const stats = serverStats ?? local ?? null;
  const settledRemotely = remote.isSuccess || remote.isError;
  const hasError = remote.isError && local !== undefined && !stats;
  const isOfflineFallback = remote.isError && Boolean(stats);

  return { stats, isLoading: !stats && !settledRemotely, hasError, isOfflineFallback };
}

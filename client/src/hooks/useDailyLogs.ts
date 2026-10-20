import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { db } from "@/lib/db";
import { queryKeys } from "@/lib/query-keys";
import { getPendingLogs, mergeLogs, updateStatsLocally } from "@/lib/sync";
import type { DailyLog } from "@/types/progress";

type UseDailyLogsOptions = {
  routineDayId?: string;
};

function filterLogs(logs: DailyLog[], routineDayId?: string) {
  if (!routineDayId) return logs;
  return logs.filter((log) => log.routine_day_id === routineDayId || log.routine_day === routineDayId);
}

async function fetchAndMergeLogs(routineDayId?: string): Promise<DailyLog[]> {
  const query = routineDayId ? `?routine_day_id=${routineDayId}` : "";
  const remoteLogs = await authenticatedClientFetch<DailyLog[]>(`/api/v1/progress/logs/${query}`);

  const pendingLogs = await getPendingLogs();
  const mergedLogs = mergeLogs(remoteLogs, pendingLogs);

  const localLogs = await db.dailyLogs.toArray();
  const allCachedLogs = mergeLogs(localLogs, mergedLogs);
  await db.dailyLogs.clear();
  await db.dailyLogs.bulkAdd(allCachedLogs);
  await updateStatsLocally(allCachedLogs);

  return filterLogs(mergedLogs, routineDayId);
}

/**
 * Daily logs, offline first. Dexie (plus anything still queued to sync) is
 * read at once and shown, so logs appear on cold start, offline, or on a slow
 * network; the server answer (merged the same way) then replaces it.
 */
export function useDailyLogs(options: UseDailyLogsOptions = {}) {
  const queryKey = queryKeys.progress.logs(options.routineDayId);

  // undefined while Dexie is still answering.
  const local = useLiveQuery<DailyLog[] | undefined>(async () => {
    const [localLogs, pendingLogs] = await Promise.all([db.dailyLogs.toArray(), getPendingLogs()]);
    return filterLogs(mergeLogs(localLogs, pendingLogs), options.routineDayId);
  }, [options.routineDayId]);

  const remote = useQuery<DailyLog[]>({
    queryKey,
    queryFn: () => fetchAndMergeLogs(options.routineDayId),
    staleTime: 30_000,
  });

  const serverLogs = remote.isError ? undefined : remote.data;
  const logs = serverLogs ?? local ?? [];
  const settledRemotely = remote.isSuccess || remote.isError;
  const hasError = remote.isError && local !== undefined && local.length === 0;
  const isOfflineFallback = remote.isError && logs.length > 0;

  return {
    logs,
    isLoading: logs.length === 0 && !settledRemotely,
    hasError,
    isOfflineFallback,
    refreshLogs: remote.refetch,
  };
}

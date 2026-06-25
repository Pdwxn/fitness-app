import { useQuery } from "@tanstack/react-query";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { db } from "@/lib/db";
import { queryKeys } from "@/lib/query-keys";
import { getPendingLogs, mergeLogs, updateStatsLocally } from "@/lib/sync";
import type { DailyLog } from "@/types/progress";

type UseDailyLogsOptions = {
  routineDayId?: string;
};

export function useDailyLogs(options: UseDailyLogsOptions = {}) {
  const queryKey = queryKeys.progress.logs(options.routineDayId);

  const { data, isLoading, isError, refetch } = useQuery<DailyLog[]>({
    queryKey,
    queryFn: async () => {
      const query = options.routineDayId ? `?routine_day_id=${options.routineDayId}` : "";
      const remoteLogs = await authenticatedClientFetch<DailyLog[]>(`/api/v1/progress/logs/${query}`);

      const pendingLogs = await getPendingLogs();
      const mergedLogs = mergeLogs(remoteLogs, pendingLogs);

      const localLogs = await db.dailyLogs.toArray();
      const allCachedLogs = mergeLogs(localLogs, mergedLogs);
      await db.dailyLogs.clear();
      await db.dailyLogs.bulkAdd(allCachedLogs);
      await updateStatsLocally(allCachedLogs);

      return filterLogs(mergedLogs, options.routineDayId);
    },
    staleTime: 30_000,
  });

  const logs = data ?? [];
  const hasError = isError && !logs.length;
  const isOfflineFallback = isError && Boolean(logs.length);

  return {
    logs,
    isLoading,
    hasError,
    isOfflineFallback,
    refreshLogs: refetch,
  };
}

function filterLogs(logs: DailyLog[], routineDayId?: string) {
  if (!routineDayId) return logs;
  return logs.filter((log) => log.routine_day_id === routineDayId || log.routine_day === routineDayId);
}

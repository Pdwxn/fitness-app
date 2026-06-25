import { useQuery } from "@tanstack/react-query";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { queryKeys } from "@/lib/query-keys";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
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

      const pendingLogs = getPendingLogs();
      const mergedLogs = mergeLogs(remoteLogs, pendingLogs);

      const allCachedLogs = mergeLogs(
        mergedLogs,
        getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [],
      );
      setInStorage(STORAGE_KEYS.DAILY_LOGS, allCachedLogs);
      updateStatsLocally(allCachedLogs);

      return mergedLogs;
    },
    staleTime: 30_000,
  });

  const cachedLogs = getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [];
  const pendingLogs = getPendingLogs();
  const localLogs = mergeLogs(cachedLogs, pendingLogs);
  const filteredLocalLogs = filterLogs(localLogs, options.routineDayId);

  const logs = data ?? filteredLocalLogs;
  const hasError = isError && !filteredLocalLogs.length;
  const isOfflineFallback = isError && Boolean(filteredLocalLogs.length);

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

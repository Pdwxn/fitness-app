import { useEffect, useState } from "react";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { getPendingLogs, mergeLogs, updateStatsLocally } from "@/lib/sync";
import type { DailyLog } from "@/types/progress";

type UseDailyLogsOptions = {
  routineDayId?: string;
};

export function useDailyLogs(options: UseDailyLogsOptions = {}) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cachedLogs = getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [];
    const pendingLogs = getPendingLogs();
    const localLogs = mergeLogs(cachedLogs, pendingLogs);
    const filteredLocalLogs = filterLogs(localLogs, options.routineDayId);

    setLogs(filteredLocalLogs);
    setIsLoading(!filteredLocalLogs.length);
    setHasError(false);
    setIsOfflineFallback(false);

    async function loadLogs() {
      try {
        const query = options.routineDayId ? `?routine_day_id=${options.routineDayId}` : "";
        const remoteLogs = await authenticatedClientFetch<DailyLog[]>(`/api/v1/progress/logs/${query}`);
        if (cancelled) return;

        const mergedLogs = mergeLogs(remoteLogs, pendingLogs);
        const allCachedLogs = mergeLogs(mergedLogs, cachedLogs);
        setLogs(filterLogs(mergedLogs, options.routineDayId));
        setInStorage(STORAGE_KEYS.DAILY_LOGS, allCachedLogs);
        updateStatsLocally(allCachedLogs);
      } catch {
        if (cancelled) return;
        setHasError(!filteredLocalLogs.length);
        setIsOfflineFallback(Boolean(filteredLocalLogs.length));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [options.routineDayId, refreshIndex]);

  function refreshLogs() {
    setRefreshIndex((current) => current + 1);
  }

  return { logs, isLoading, hasError, isOfflineFallback, refreshLogs };
}

function filterLogs(logs: DailyLog[], routineDayId?: string) {
  if (!routineDayId) return logs;
  return logs.filter((log) => log.routine_day_id === routineDayId || log.routine_day === routineDayId);
}

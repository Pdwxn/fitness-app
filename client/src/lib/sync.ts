import { authenticatedClientFetch } from "./api/authenticated-client";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "./storage";
import type { DailyLog, DailyLogBatchResponse, ProgressStats } from "@/types/progress";

function getLogKey(log: Pick<DailyLog, "id" | "routine_day_id" | "date">) {
  return log.id || `${log.routine_day_id}:${log.date}`;
}

export function mergeLogs(localLogs: DailyLog[], remoteLogs: DailyLog[]) {
  const merged = new Map<string, DailyLog>();
  for (const log of remoteLogs) {
    merged.set(getLogKey(log), log);
  }
  for (const log of localLogs) {
    merged.set(getLogKey(log), log);
  }
  return Array.from(merged.values()).sort((left, right) => right.date.localeCompare(left.date));
}

export function calculateStats(logs: DailyLog[], pendingCount = 0): ProgressStats {
  const stats: ProgressStats = logs.reduce(
    (current, log) => {
      const exercisesCompleted = log.exercises_done.filter(
        (exercise) => exercise.completed,
      ).length;

        return {
          completed_days: current.completed_days + (log.completed ? 1 : 0),
          total_exercises_completed:
            current.total_exercises_completed + exercisesCompleted,
          pending_sync: pendingCount,
        };
      },
    { completed_days: 0, total_exercises_completed: 0, pending_sync: pendingCount },
  );

  return stats;
}

export function updateStatsLocally(logs: DailyLog[]) {
  const pending = getFromStorage<DailyLog[]>(STORAGE_KEYS.PENDING_SYNC) ?? [];
  const stats = calculateStats(logs, pending.length);

  setInStorage(STORAGE_KEYS.STATS, stats);
  return stats;
}

export function saveLogLocally(log: DailyLog) {
  const logs = getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [];
  const logKey = getLogKey(log);
  const updated = [...logs.filter((item) => getLogKey(item) !== logKey), log];

  setInStorage(STORAGE_KEYS.DAILY_LOGS, updated);
  updateStatsLocally(updated);

  const pending = getFromStorage<DailyLog[]>(STORAGE_KEYS.PENDING_SYNC) ?? [];
  const pendingUpdated = [...pending.filter((item) => getLogKey(item) !== logKey), log];
  setInStorage(STORAGE_KEYS.PENDING_SYNC, pendingUpdated);
}

export function getLocalLogs() {
  return getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [];
}

export function getPendingLogs() {
  return getFromStorage<DailyLog[]>(STORAGE_KEYS.PENDING_SYNC) ?? [];
}

export async function syncPendingLogs() {
  const pending = getFromStorage<DailyLog[]>(STORAGE_KEYS.PENDING_SYNC);
  if (!pending?.length) return;

  try {
    const response = await authenticatedClientFetch<DailyLogBatchResponse>("/api/v1/progress/logs/batch/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ logs: pending }),
    });

    const localLogs = getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [];
    const mergedLogs = mergeLogs(localLogs, response.logs);
    setInStorage(STORAGE_KEYS.PENDING_SYNC, []);
    setInStorage(STORAGE_KEYS.DAILY_LOGS, mergedLogs);
    updateStatsLocally(mergedLogs);
    setInStorage(STORAGE_KEYS.LAST_SYNC, Date.now());
  } catch {
    // Backend may be asleep on the free tier. Keep data local and retry later.
  }
}

export function startSilentSync(intervalMs = 10_000) {
  void syncPendingLogs();
  return window.setInterval(syncPendingLogs, intervalMs);
}

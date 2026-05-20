import { apiFetch } from "./api";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "./storage";
import type { DailyLog, ProgressStats } from "@/types/progress";

function updateStatsLocally(logs: DailyLog[]) {
  const stats: ProgressStats = logs.reduce(
    (current, log) => {
      const exercisesCompleted = log.exercises_done.filter(
        (exercise) => exercise.completed,
      ).length;

      return {
        completed_days: current.completed_days + (log.completed ? 1 : 0),
        total_exercises_completed:
          current.total_exercises_completed + exercisesCompleted,
      };
    },
    { completed_days: 0, total_exercises_completed: 0 },
  );

  setInStorage(STORAGE_KEYS.STATS, stats);
}

export function saveLogLocally(log: DailyLog) {
  const logs = getFromStorage<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS) ?? [];
  const updated = [...logs.filter((item) => item.id !== log.id), log];

  setInStorage(STORAGE_KEYS.DAILY_LOGS, updated);
  updateStatsLocally(updated);

  const pending = getFromStorage<DailyLog[]>(STORAGE_KEYS.PENDING_SYNC) ?? [];
  const pendingUpdated = [...pending.filter((item) => item.id !== log.id), log];
  setInStorage(STORAGE_KEYS.PENDING_SYNC, pendingUpdated);
}

export async function syncPendingLogs() {
  const pending = getFromStorage<DailyLog[]>(STORAGE_KEYS.PENDING_SYNC);
  if (!pending?.length) return;

  try {
    await apiFetch("/api/v1/progress/logs/batch/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ logs: pending }),
    });
    setInStorage(STORAGE_KEYS.PENDING_SYNC, []);
    setInStorage(STORAGE_KEYS.LAST_SYNC, Date.now());
  } catch {
    // Backend may be asleep on the free tier. Keep data local and retry later.
  }
}

export function startSilentSync(intervalMs = 10_000) {
  void syncPendingLogs();
  return window.setInterval(syncPendingLogs, intervalMs);
}

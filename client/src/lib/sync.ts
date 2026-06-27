import { authenticatedClientFetch } from "./api/authenticated-client";
import { db, type StatsEntry } from "./db";
import { useNextRoutineStore } from "@/store/nextRoutineStore";
import type { DailyLog, DailyLogBatchResponse, ProgressStats } from "@/types/progress";

function getLogKey(log: Pick<DailyLog, "id" | "routine_day_id" | "date">) {
  return log.id || `${log.routine_day_id}:${log.date}`;
}

type Syncable = {
  id: string;
  updated_at?: string;
  [key: string]: unknown;
};

function resolveLWW<T extends Syncable>(local: T, remote: T): T {
  const localTime = local.updated_at ?? "1970-01-01T00:00:00Z";
  const remoteTime = remote.updated_at ?? "1970-01-01T00:00:00Z";
  return new Date(localTime) >= new Date(remoteTime) ? local : remote;
}

export function mergeLogs(localLogs: DailyLog[], remoteLogs: DailyLog[]) {
  const merged = new Map<string, DailyLog>();

  for (const log of remoteLogs) {
    merged.set(getLogKey(log), log);
  }

  for (const log of localLogs) {
    const key = getLogKey(log);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, resolveLWW(log, existing));
    } else {
      merged.set(key, log);
    }
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

export async function saveLogLocally(log: DailyLog): Promise<void> {
  const existing = await db.dailyLogs.get(log.id);
  if (existing) {
    await db.dailyLogs.put({ ...existing, ...log });
  } else {
    await db.dailyLogs.add(log);
  }

  const existingPending = await db.pendingSync
    .filter((item) => item.log.routine_day_id === log.routine_day_id && item.log.date === log.date)
    .first();
  if (existingPending) {
    await db.pendingSync.update(existingPending.id, { log });
  } else {
    await db.pendingSync.add({
      id: crypto.randomUUID(),
      log,
      createdAt: new Date().toISOString(),
    });
  }

  await updateStatsIncrementally(log);
}

export async function getLocalLogs(): Promise<DailyLog[]> {
  return db.dailyLogs.toArray();
}

export async function getPendingLogs(): Promise<DailyLog[]> {
  const items = await db.pendingSync.toArray();
  return items.map((item) => item.log);
}

export async function syncPendingLogs(): Promise<boolean> {
  const pending = await db.pendingSync.toArray();
  if (!pending.length) return true;

  const pendingLogs = pending.map((item) => item.log);

  try {
    const response = await authenticatedClientFetch<DailyLogBatchResponse>("/api/v1/progress/logs/batch/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ logs: pendingLogs }),
    });

    const localLogs = await db.dailyLogs.toArray();
    const mergedLogs = mergeLogs(localLogs, response.logs);
    await db.dailyLogs.clear();
    await db.dailyLogs.bulkAdd(mergedLogs);
    await db.pendingSync.clear();

    const mergedStats = calculateStats(mergedLogs, 0);
    await db.stats.put({ id: "progress", ...mergedStats });

    if (response.next_routine) {
      useNextRoutineStore.getState().setNextRoutine(response.next_routine);
    }

    return true;
  } catch {
    return false;
  }
}

export async function updateStatsIncrementally(newLog: DailyLog): Promise<StatsEntry> {
  const current = await db.stats.get("progress");
  const stats: StatsEntry = current ?? { id: "progress", completed_days: 0, total_exercises_completed: 0, pending_sync: 0 };

  if (newLog.completed) {
    stats.completed_days += 1;
  }
  stats.total_exercises_completed += newLog.exercises_done.filter((e) => e.completed).length;

  await db.stats.put(stats);
  return stats;
}

export async function updateStatsLocally(logs: DailyLog[]): Promise<StatsEntry> {
  const pending = await db.pendingSync.count();
  const stats = calculateStats(logs, pending);
  const entry: StatsEntry = { id: "progress", ...stats };
  await db.stats.put(entry);
  return entry;
}

export function startSilentSync(intervalMs = 30_000) {
  void syncPendingLogs();
  return window.setInterval(syncPendingLogs, intervalMs);
}

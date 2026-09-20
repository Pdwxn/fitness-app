import { ApiError, authenticatedClientFetch } from "./api/authenticated-client";
import { fetchFullExerciseCatalog } from "./api/exercises";
import { createManualRoutine } from "./api/routines";
import { db, getMeta, META_KEYS, setMeta, type StatsEntry } from "./db";
import { queryClient } from "./query-client";
import { queryKeys } from "./query-keys";
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
    if (response.next_proposal) {
      useNextRoutineStore.getState().setNextProposal(response.next_proposal);
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposal.pending() });
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

// --- exercise catalog ----------------------------------------------------- //

const CATALOG_MAX_AGE_MS = 24 * 60 * 60_000;

/** Latest `updated_at` among the given exercises, compared numerically (not as
 * raw strings -- DRF's ISO output drops the fractional seconds when they're
 * zero, which breaks naive string comparison). `null` if the list is empty. */
function newestUpdatedAt(exercises: { updated_at: string }[]): string | null {
  return exercises.reduce<string | null>((max, ex) => {
    if (!max) return ex.updated_at;
    return new Date(ex.updated_at).getTime() > new Date(max).getTime() ? ex.updated_at : max;
  }, null);
}

/**
 * Syncs the exercise catalog into Dexie: a full download on the first run, a
 * delta (`?updated_since=`) once we have a previous cursor. Skips entirely if
 * a sync happened within the last 24h, unless `force` is set.
 * Returns false on network failure (the existing catalog stays usable).
 */
export async function syncExerciseCatalog(force = false): Promise<boolean> {
  const previousCursor = await getMeta(META_KEYS.exercisesSyncedAt);

  if (!force && previousCursor) {
    const age = Date.now() - new Date(previousCursor).getTime();
    const count = await db.exercises.count().catch(() => 0);
    if (age < CATALOG_MAX_AGE_MS && count > 0) return true;
  }

  try {
    const catalog = await fetchFullExerciseCatalog(previousCursor ?? undefined);
    if (catalog.length > 0) {
      await db.exercises.bulkPut(catalog);
    }
    // Cursor for the *next* sync is the newest `updated_at` the server actually
    // sent us (server clock), not the client's local time -- avoids missing
    // rows on client/server clock skew. Falls back to the previous cursor, or
    // now on a genuinely first sync, when nothing came back.
    const cursor = newestUpdatedAt(catalog) ?? previousCursor ?? new Date().toISOString();
    await setMeta(META_KEYS.exercisesSyncedAt, cursor);
    return true;
  } catch {
    return false;
  }
}

// --- offline-built routines --------------------------------------------------- //

/**
 * Uploads routines that were built offline. In practice the builder only ever
 * leaves one queued (the backend enforces a single active routine), but we
 * process the queue in order and keep the last result.
 */
export async function syncPendingRoutines(): Promise<boolean> {
  let items;
  try {
    items = await db.pendingRoutines.orderBy("createdAt").toArray();
  } catch {
    return false;
  }
  if (!items.length) return true;

  let allOk = true;
  for (const item of items) {
    try {
      const routine = await createManualRoutine(item.payload);
      await db.pendingRoutines.delete(item.id);
      await db.routineCache.put(routine);
      queryClient.setQueryData(queryKeys.routine.active(), routine);
      void queryClient.invalidateQueries({ queryKey: queryKeys.routine.active() });
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        // Payload the server will never accept — drop it so we don't loop.
        await db.pendingRoutines.delete(item.id);
        allOk = false;
      } else {
        // Network / server error — keep it for the next attempt.
        allOk = false;
      }
    }
  }
  return allOk;
}

export function startSilentSync(intervalMs = 30_000) {
  const runAll = () => {
    void syncPendingLogs();
    void syncPendingRoutines();
    void syncExerciseCatalog();
  };
  runAll();
  return window.setInterval(runAll, intervalMs);
}

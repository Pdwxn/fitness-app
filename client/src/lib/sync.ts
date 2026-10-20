import { ApiError, authenticatedClientFetch } from "./api/authenticated-client";
import { fetchFullExerciseCatalog, fetchRemovedExercises } from "./api/exercises";
import { createManualRoutine } from "./api/routines";
import { db, getMeta, META_KEYS, setMeta, type PendingSyncItem, type StatsEntry } from "./db";
import { queryClient } from "./query-client";
import { queryKeys } from "./query-keys";
import { useNextRoutineStore } from "@/store/nextRoutineStore";
import { useSyncIssuesStore } from "@/store/syncIssuesStore";
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

/** Saves logs the server accepted into Dexie/stats. Safe to call with an empty list. */
async function applySyncedLogs(syncedLogs: DailyLog[]): Promise<void> {
  if (!syncedLogs.length) return;
  const localLogs = await db.dailyLogs.toArray();
  const mergedLogs = mergeLogs(localLogs, syncedLogs);
  await db.dailyLogs.clear();
  await db.dailyLogs.bulkAdd(mergedLogs);
  const pendingCount = await db.pendingSync.count();
  await db.stats.put({ id: "progress", ...calculateStats(mergedLogs, pendingCount) });
}

function isPermanentFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

/**
 * Fallback when the batch request was rejected (not a network error -- the
 * server actively refused it): sends each log on its own, so a single log the
 * server will never accept (its routine day was edited away, say) doesn't
 * hold the rest of the queue hostage forever. Permanently-rejected logs are
 * dropped and reported once via `useSyncIssuesStore`; network failures are
 * left in the queue for the next attempt.
 */
async function syncPendingLogsOneByOne(pending: PendingSyncItem[]): Promise<boolean> {
  let allOk = true;
  const synced: DailyLog[] = [];

  for (const item of pending) {
    try {
      const saved = await authenticatedClientFetch<DailyLog>("/api/v1/progress/logs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.log),
      });
      await db.pendingSync.delete(item.id);
      synced.push(saved);
    } catch (error) {
      allOk = false;
      if (isPermanentFailure(error)) {
        await db.pendingSync.delete(item.id);
        useSyncIssuesStore.getState().reportDroppedLog();
      }
    }
  }

  await applySyncedLogs(synced);
  return allOk;
}

export async function syncPendingLogs(): Promise<boolean> {
  const pending = await db.pendingSync.toArray();
  if (!pending.length) return true;

  try {
    const response = await authenticatedClientFetch<DailyLogBatchResponse>("/api/v1/progress/logs/batch/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ logs: pending.map((item) => item.log) }),
    });

    await db.pendingSync.clear();
    await applySyncedLogs(response.logs);

    if (response.next_routine) {
      useNextRoutineStore.getState().setNextRoutine(response.next_routine);
    }
    if (response.next_proposal) {
      useNextRoutineStore.getState().setNextProposal(response.next_proposal);
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposal.pending() });
    }

    return true;
  } catch (error) {
    if (!isPermanentFailure(error)) return false; // network/server hiccup: keep everything, retry later
    return syncPendingLogsOneByOne(pending);
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
    // A delta can't carry removals, so ask for them separately. Their
    // `updated_at` also moves the cursor, otherwise the same removals would
    // come back on every sync.
    const removed = previousCursor ? await fetchRemovedExercises(previousCursor) : [];
    if (removed.length > 0) {
      await db.exercises.bulkDelete(removed.map((exercise) => exercise.external_id));
    }
    // Cursor for the *next* sync is the newest `updated_at` the server actually
    // sent us (server clock), not the client's local time -- avoids missing
    // rows on client/server clock skew. Falls back to the previous cursor, or
    // now on a genuinely first sync, when nothing came back.
    const cursor = newestUpdatedAt([...catalog, ...removed]) ?? previousCursor ?? new Date().toISOString();
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
    // The exercise catalog isn't part of startup: it's fetched when the picker
    // opens (see ExercisePicker), so launching the app stays light.
  };
  runAll();
  return window.setInterval(runAll, intervalMs);
}

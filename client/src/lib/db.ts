import Dexie, { type EntityTable } from "dexie";
import type { DailyLog } from "@/types/progress";
import type { ManualRoutineDraft, RoutineCache } from "@/types/routine";
import type { Exercise } from "@/types/exercise";

export interface PendingSyncItem {
  id: string;
  log: DailyLog;
  createdAt: string;
}

export interface StatsEntry {
  id: string;
  completed_days: number;
  total_exercises_completed: number;
  pending_sync: number;
}

/** Loose key/value store for small bits of client state (sync timestamps, drafts). */
export interface MetaEntry {
  key: string;
  value: string;
}

/** A routine built offline, queued for `POST /api/v1/routines/manual/`. */
export interface PendingRoutineItem {
  id: string;
  payload: ManualRoutineDraft;
  createdAt: string;
}

/**
 * A user's chosen progression policy for one exercise (by its stable catalog
 * id, `StoredExercise.external_id`), overriding the experience-level default.
 * Local-only in v1 -- deliberately not synced to the backend (see
 * `apex-fit-progression-engine-plan.md`): it's a low-stakes preference, and
 * requiring a round trip to change it would fight the "must work with no
 * signal in the gym" goal this whole feature exists for.
 */
export interface ProgressionPrefEntry {
  source_external_id: string;
  policy: "off" | "linear" | "double";
}

export const META_KEYS = {
  exercisesSyncedAt: "exercises_synced_at",
  routineBuilderDraft: "routine_builder_draft",
  pushSubscribedAt: "push_subscribed_at",
} as const;

export class ApexFitDB extends Dexie {
  routineCache!: EntityTable<RoutineCache, "id">;
  dailyLogs!: EntityTable<DailyLog, "id">;
  pendingSync!: EntityTable<PendingSyncItem, "id">;
  stats!: EntityTable<StatsEntry, "id">;
  exercises!: EntityTable<Exercise, "external_id">;
  meta!: EntityTable<MetaEntry, "key">;
  pendingRoutines!: EntityTable<PendingRoutineItem, "id">;
  progressionPrefs!: EntityTable<ProgressionPrefEntry, "source_external_id">;

  constructor() {
    super("apex-fit");
    this.version(1).stores({
      routineCache: "&id",
      dailyLogs: "&id, routine_day_id, date, [routine_day_id+date]",
      pendingSync: "&id, createdAt",
      stats: "&id",
    });
    this.version(2).stores({
      routineCache: "&id",
      dailyLogs: "&id, routine_day_id, date, [routine_day_id+date]",
      pendingSync: "&id, createdAt",
      stats: "&id",
      exercises: "&external_id, name, category, equipment, *primary_muscles, updated_at",
      meta: "&key",
      pendingRoutines: "&id, createdAt",
    });
    this.version(3).stores({
      progressionPrefs: "&source_external_id",
    });
  }
}

export const db = new ApexFitDB();

export async function getMeta(key: string): Promise<string | null> {
  try {
    const entry = await db.meta.get(key);
    return entry?.value ?? null;
  } catch {
    return null;
  }
}

export async function setMeta(key: string, value: string): Promise<void> {
  try {
    await db.meta.put({ key, value });
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export async function deleteMeta(key: string): Promise<void> {
  try {
    await db.meta.delete(key);
  } catch {
    /* non-fatal */
  }
}

import { db } from "@/lib/db";
import { getFromStorage, STORAGE_KEYS } from "@/lib/storage";
import type { OnboardingHealth } from "@/types/onboarding";
import type { ExerciseLog } from "@/types/progress";

/**
 * Client-side progression engine. Runs entirely offline: everything it reads
 * (`db.dailyLogs`, `db.exercises`, `db.progressionPrefs`, plus the profile's
 * cached `experience_level` in localStorage) is already local, so a
 * suggestion is available with zero network access -- the whole point, since
 * this is meant to be checked mid-workout at the gym.
 *
 * Stateless by design (see `apex-fit-progression-engine-plan.md` §3): no
 * stored counters, every suggestion is derived fresh from the full logged
 * history for that exercise. A stored counter is one more thing that can
 * silently drift from reality; recomputing is cheap at this data size (tens
 * of log rows per exercise, not thousands).
 */

export type ProgressionPolicy = "off" | "linear" | "double";

export type ProgressionKind =
  | "no_catalog_match"
  | "policy_off"
  | "no_history"
  | "unavailable_equipment"
  | "repeat_incomplete_sets"
  | "repeat_missed_reps"
  | "increase_reps"
  | "increase_weight";

export type ProgressionSuggestion = {
  policy: ProgressionPolicy;
  kind: ProgressionKind;
  nextWeightKg?: number;
  nextReps?: string;
  /** Interpolation values for the translated reason string, e.g. `{increment: 2.5}`. */
  params?: Record<string, string | number>;
};

/**
 * Weight increment by equipment type, mirroring openGym's approach: a barbell
 * and a dumbbell don't jump by the same amount. Grouped from the real
 * `equipment` values in the current dataset (`StoredExercise.equipment`) --
 * an equipment string not listed here (a new one from a future dataset
 * import, or a bodyweight/cardio/accessory exercise with no meaningful
 * numeric jump) falls back to "no numeric suggestion" rather than guessing.
 */
const EQUIPMENT_INCREMENTS_KG: Record<string, number> = {
  barbell: 2.5,
  "ez barbell": 2.5,
  "olympic barbell": 2.5,
  "trap bar": 2.5,
  "smith machine": 2.5,
  dumbbell: 2,
  kettlebell: 2,
  weighted: 2,
  cable: 5,
  "leverage machine": 5,
  "sled machine": 5,
};

export function getIncrementKg(equipment: string | null | undefined): number | null {
  if (!equipment) return null;
  return EQUIPMENT_INCREMENTS_KG[equipment.trim().toLowerCase()] ?? null;
}

export function defaultPolicyForExperience(
  experienceLevel: string | null | undefined,
): ProgressionPolicy {
  if (experienceLevel === "intermediate" || experienceLevel === "advanced") return "double";
  // "beginner", unset, or anything else (offline cold-start with no cached
  // profile yet) -- linear is the safer default, it never withholds a
  // suggestion waiting for every set to be perfect.
  return "linear";
}

/** Parses `"8-10"` or `"10"` into `{min, max}`. `null` if unparseable (e.g. "AMRAP", "30s"). */
export function parseRepRange(reps: string | null | undefined): { min: number; max: number } | null {
  if (!reps) return null;
  const trimmed = reps.trim();

  const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return a <= b ? { min: a, max: b } : { min: b, max: a };
  }

  const single = trimmed.match(/^(\d+)$/);
  if (single) {
    const n = Number(single[1]);
    return { min: n, max: n };
  }

  return null;
}

/** Extracts every integer/decimal found in a free-text `actual_reps` value, e.g. "8,9,10" -> [8,9,10]. */
export function parseAchievedNumbers(actualReps: string | null | undefined): number[] {
  if (!actualReps) return [];
  const matches = actualReps.match(/\d+(\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type ComputeSuggestionInput = {
  policy: ProgressionPolicy;
  equipment: string | null | undefined;
  plannedReps: string | null | undefined;
  plannedSets: number | null | undefined;
  /** Most recent past log entry for this exercise (by source_external_id), if any. */
  lastEntry: ExerciseLog | null;
  hasCatalogMatch: boolean;
};

/**
 * Pure decision function -- no I/O, fully unit-testable. `suggestNext` below
 * is the thin async wrapper that gathers this input from Dexie.
 *
 * Honest-reading policy, same spirit as openGym: an incomplete or unparseable
 * session never gets rounded up into "you crushed it" -- when in doubt, this
 * repeats the last prescription instead of pushing the user past what they
 * actually demonstrated.
 */
export function computeSuggestion(input: ComputeSuggestionInput): ProgressionSuggestion {
  const { policy, equipment, plannedReps, plannedSets, lastEntry, hasCatalogMatch } = input;

  if (!hasCatalogMatch) {
    return { policy: "off", kind: "no_catalog_match" };
  }
  if (policy === "off") {
    return { policy: "off", kind: "policy_off" };
  }
  if (!lastEntry) {
    return { policy, kind: "no_history" };
  }

  const incrementKg = getIncrementKg(equipment);
  const range = parseRepRange(plannedReps);
  if (incrementKg === null || range === null) {
    return { policy, kind: "unavailable_equipment" };
  }

  if (!lastEntry.completed) {
    return { policy, kind: "repeat_incomplete_sets", nextReps: plannedReps ?? undefined };
  }

  if (
    policy === "double" &&
    plannedSets != null &&
    lastEntry.actual_sets != null &&
    lastEntry.actual_sets < plannedSets
  ) {
    return { policy, kind: "repeat_incomplete_sets", nextReps: plannedReps ?? undefined };
  }

  const achieved = parseAchievedNumbers(lastEntry.actual_reps);
  if (achieved.length === 0) {
    return { policy, kind: "repeat_missed_reps", nextReps: plannedReps ?? undefined };
  }

  const hitCeiling = achieved.every((n) => n >= range.max);
  if (hitCeiling) {
    const lastWeight =
      lastEntry.actual_weight_kg != null ? Number(lastEntry.actual_weight_kg) : null;
    return {
      policy,
      kind: "increase_weight",
      nextWeightKg: lastWeight != null ? round1(lastWeight + incrementKg) : undefined,
      nextReps: plannedReps ?? undefined,
      params: { increment: incrementKg },
    };
  }

  const metFloor = achieved.every((n) => n >= range.min);
  if (policy === "double" && metFloor) {
    return { policy, kind: "increase_reps", nextReps: plannedReps ?? undefined };
  }

  return { policy, kind: "repeat_missed_reps", nextReps: plannedReps ?? undefined };
}

/** Every past logged entry for this exercise (by stable catalog id), newest first. */
export async function getExerciseHistory(sourceExternalId: string): Promise<ExerciseLog[]> {
  if (!sourceExternalId) return [];
  const logs = await db.dailyLogs.orderBy("date").reverse().toArray();
  const entries: ExerciseLog[] = [];
  for (const log of logs) {
    for (const entry of log.exercises_done) {
      if (entry.source_external_id === sourceExternalId) entries.push(entry);
    }
  }
  return entries;
}

export async function getExercisePolicy(sourceExternalId: string): Promise<ProgressionPolicy> {
  const pref = await db.progressionPrefs.get(sourceExternalId).catch(() => undefined);
  if (pref) return pref.policy;
  // Reuses the profile's own localStorage cache (`ProfileContent.tsx`) rather
  // than duplicating it in Dexie -- already populated the first time the
  // user opens their profile, already offline-durable.
  const cachedHealth = getFromStorage<OnboardingHealth>(STORAGE_KEYS.HEALTH_PROFILE);
  return defaultPolicyForExperience(cachedHealth?.experience_level);
}

export async function setExercisePolicy(
  sourceExternalId: string,
  policy: ProgressionPolicy,
): Promise<void> {
  await db.progressionPrefs.put({ source_external_id: sourceExternalId, policy });
}

export type SuggestNextParams = {
  sourceExternalId: string | null | undefined;
  plannedReps: string | null | undefined;
  plannedSets: number | null | undefined;
};

/** Orchestrates the Dexie reads and calls `computeSuggestion`. The only async entry point in this module. */
export async function suggestNext(params: SuggestNextParams): Promise<ProgressionSuggestion> {
  const sourceExternalId = params.sourceExternalId || "";
  if (!sourceExternalId) {
    return { policy: "off", kind: "no_catalog_match" };
  }

  const [policy, catalogExercise, history] = await Promise.all([
    getExercisePolicy(sourceExternalId),
    db.exercises.get(sourceExternalId).catch(() => undefined),
    getExerciseHistory(sourceExternalId),
  ]);

  return computeSuggestion({
    policy,
    equipment: catalogExercise?.equipment,
    plannedReps: params.plannedReps,
    plannedSets: params.plannedSets,
    lastEntry: history[0] ?? null,
    hasCatalogMatch: true,
  });
}

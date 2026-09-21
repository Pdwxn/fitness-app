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

export type ProgressionPolicy = "off" | "linear" | "double" | "greyskull";

export type ProgressionKind =
  | "no_catalog_match"
  | "policy_off"
  | "no_history"
  | "unavailable_equipment"
  | "repeat_incomplete_sets"
  | "repeat_missed_reps"
  | "increase_reps"
  | "increase_weight"
  /** Timed exercise (planks...): hold a bit longer. */
  | "increase_time"
  /** Bodyweight exercise past the top of its range: aim for more reps. */
  | "raise_rep_target"
  /** Bodyweight exercise with plenty of reps: time to add load or a harder variation. */
  | "add_bodyweight_load"
  /** Repeated failures on the top set: drop the weight and build back up. */
  | "deload";

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

/** Bodyweight movements progress by reps; past this many reps in every set, load is the better lever. */
export const BODYWEIGHT_LOAD_REPS = 20;
/** Failed top sets in a row before GreySkull suggests a deload. */
const GREYSKULL_DELOAD_AFTER = 3;
const GREYSKULL_DELOAD_FACTOR = 0.9;

const BODYWEIGHT_EQUIPMENT = new Set(["body weight", "bodyweight"]);

export function isBodyweight(equipment: string | null | undefined): boolean {
  return !!equipment && BODYWEIGHT_EQUIPMENT.has(equipment.trim().toLowerCase());
}

const TIME_UNITS: Record<string, { label: string; step: number }> = {
  s: { label: "s", step: 5 },
  sec: { label: "s", step: 5 },
  secs: { label: "s", step: 5 },
  seg: { label: "s", step: 5 },
  seconds: { label: "s", step: 5 },
  segundos: { label: "s", step: 5 },
  min: { label: "min", step: 1 },
  mins: { label: "min", step: 1 },
  minutes: { label: "min", step: 1 },
  minutos: { label: "min", step: 1 },
};

/** `"30s"`, `"30-45 sec"`, `"2 min"` -> the range and the unit. `null` for plain rep counts. */
export function parseTimeRange(
  reps: string | null | undefined,
): { min: number; max: number; unit: string; step: number } | null {
  if (!reps) return null;
  const match = reps.trim().toLowerCase().match(/^(\d+)(?:\s*-\s*(\d+))?\s*([a-z]+)$/);
  if (!match) return null;
  const unit = TIME_UNITS[match[3]];
  if (!unit) return null;
  const a = Number(match[1]);
  const b = match[2] ? Number(match[2]) : a;
  return { min: Math.min(a, b), max: Math.max(a, b), unit: unit.label, step: unit.step };
}

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
  /** Every past entry, newest first (includes `lastEntry`). Only GreySkull's deload rule needs more than the last one. */
  history?: ExerciseLog[];
  hasCatalogMatch: boolean;
};

const repeatIncomplete = (
  policy: ProgressionPolicy,
  plannedReps: string | null | undefined,
): ProgressionSuggestion => ({ policy, kind: "repeat_incomplete_sets", nextReps: plannedReps ?? undefined });

const repeatMissed = (
  policy: ProgressionPolicy,
  plannedReps: string | null | undefined,
): ProgressionSuggestion => ({ policy, kind: "repeat_missed_reps", nextReps: plannedReps ?? undefined });

/** Timed holds: every set at the top of the range -> a few more seconds. */
function computeTimeSuggestion(
  policy: ProgressionPolicy,
  time: NonNullable<ReturnType<typeof parseTimeRange>>,
  plannedReps: string | null | undefined,
  lastEntry: ExerciseLog,
): ProgressionSuggestion {
  if (!lastEntry.completed) return repeatIncomplete(policy, plannedReps);
  // The user types the time (in the planned unit) where the reps go.
  const achieved = parseAchievedNumbers(lastEntry.actual_reps);
  if (achieved.length === 0) return repeatMissed(policy, plannedReps);

  if (achieved.every((n) => n >= time.max)) {
    const next = Math.max(...achieved) + time.step;
    return {
      policy,
      kind: "increase_time",
      nextReps: `${next}${time.unit}`,
      params: { step: time.step, unit: time.unit, target: `${next}${time.unit}` },
    };
  }
  if (achieved.every((n) => n >= time.min)) {
    return { policy, kind: "increase_reps", nextReps: plannedReps ?? undefined };
  }
  return repeatMissed(policy, plannedReps);
}

/** Bodyweight: no plates to add, so the ceiling of the range is the trigger to push reps (and, far enough, load). */
function computeBodyweightSuggestion(
  policy: ProgressionPolicy,
  range: { min: number; max: number },
  plannedReps: string | null | undefined,
  lastEntry: ExerciseLog,
): ProgressionSuggestion {
  if (!lastEntry.completed) return repeatIncomplete(policy, plannedReps);
  const achieved = parseAchievedNumbers(lastEntry.actual_reps);
  if (achieved.length === 0) return repeatMissed(policy, plannedReps);

  const lowest = Math.min(...achieved);
  if (lowest >= BODYWEIGHT_LOAD_REPS) {
    return { policy, kind: "add_bodyweight_load", params: { reps: lowest } };
  }
  if (achieved.every((n) => n >= range.max)) {
    return { policy, kind: "raise_rep_target", nextReps: String(lowest + 2), params: { reps: lowest + 2 } };
  }
  if (achieved.every((n) => n >= range.min)) {
    return { policy, kind: "increase_reps", nextReps: plannedReps ?? undefined };
  }
  return repeatMissed(policy, plannedReps);
}

/** The top set of a logged exercise: the last set the user ticked (GreySkull's AMRAP set goes last). */
function topSetOf(entry: ExerciseLog): { reps: number; weightKg: number | null } | null {
  const done = entry.sets?.filter((set) => set.completed) ?? [];
  const top = done[done.length - 1];
  if (!top) return null;
  const reps = parseAchievedNumbers(top.reps)[0];
  if (reps === undefined) return null;
  const weight = top.weight_kg != null && top.weight_kg !== "" ? Number(top.weight_kg) : null;
  return { reps, weightKg: weight !== null && Number.isFinite(weight) ? weight : null };
}

/**
 * GreySkull LP, adapted: the last set is the "top set" (as many reps as
 * possible). Reaching the planned minimum adds the equipment increment,
 * doubling the target adds twice that, and repeated failures deload by 10%.
 * Needs per-set data; older logs without it just repeat.
 */
function computeGreyskullSuggestion(
  range: { min: number },
  plannedReps: string | null | undefined,
  incrementKg: number,
  lastEntry: ExerciseLog,
  history: ExerciseLog[],
): ProgressionSuggestion {
  const policy: ProgressionPolicy = "greyskull";
  if (!lastEntry.completed) return repeatIncomplete(policy, plannedReps);

  const top = topSetOf(lastEntry);
  if (!top) return repeatMissed(policy, plannedReps);
  const weight = top.weightKg ?? (lastEntry.actual_weight_kg != null ? Number(lastEntry.actual_weight_kg) : null);

  if (top.reps >= range.min) {
    const jump = top.reps >= range.min * 2 ? incrementKg * 2 : incrementKg;
    return {
      policy,
      kind: "increase_weight",
      nextWeightKg: weight != null ? round1(weight + jump) : undefined,
      nextReps: plannedReps ?? undefined,
      params: { increment: jump },
    };
  }

  let failures = 0;
  for (const entry of history) {
    const t = entry.completed ? topSetOf(entry) : null;
    if (!t || t.reps >= range.min) break;
    failures += 1;
  }
  if (failures >= GREYSKULL_DELOAD_AFTER && weight != null) {
    const deloaded = Math.max(
      incrementKg,
      Math.round((weight * GREYSKULL_DELOAD_FACTOR) / incrementKg) * incrementKg,
    );
    return {
      policy,
      kind: "deload",
      nextWeightKg: round1(deloaded),
      nextReps: plannedReps ?? undefined,
      params: { failures },
    };
  }
  return repeatMissed(policy, plannedReps);
}

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
  const history = input.history ?? (input.lastEntry ? [input.lastEntry] : []);

  if (!hasCatalogMatch) {
    return { policy: "off", kind: "no_catalog_match" };
  }
  if (policy === "off") {
    return { policy: "off", kind: "policy_off" };
  }
  if (!lastEntry) {
    return { policy, kind: "no_history" };
  }

  const time = parseTimeRange(plannedReps);
  if (time) return computeTimeSuggestion(policy, time, plannedReps, lastEntry);

  const range = parseRepRange(plannedReps);
  if (range !== null && isBodyweight(equipment)) {
    return computeBodyweightSuggestion(policy, range, plannedReps, lastEntry);
  }

  const incrementKg = getIncrementKg(equipment);
  if (incrementKg === null || range === null) {
    return { policy, kind: "unavailable_equipment" };
  }

  if (policy === "greyskull") {
    return computeGreyskullSuggestion(range, plannedReps, incrementKg, lastEntry, history);
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

/** Back to the automatic default (by experience level). */
export async function clearExercisePolicy(sourceExternalId: string): Promise<void> {
  await db.progressionPrefs.delete(sourceExternalId);
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
    history,
    hasCatalogMatch: true,
  });
}

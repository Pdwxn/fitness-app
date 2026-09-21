import { parseAchievedNumbers, parseRepRange } from "@/lib/progression";
import type { ExerciseLog, ExerciseSet } from "@/types/progress";
import type { RoutineExercise } from "@/types/routine";

/**
 * Per-set logging.
 *
 * Each logged exercise now carries `sets` (reps, weight and done-ness per
 * set). The old aggregate fields (`completed`, `actual_sets`, `actual_reps`,
 * `actual_weight_kg`) are kept and *derived* from the sets by
 * {@link deriveAggregates}, so everything that already reads them -- stats,
 * the progression engine, the AI coach, older app versions still syncing --
 * keeps working untouched. This module is the only place the rule lives.
 *
 * Honest reading, same spirit as the progression engine: only sets the user
 * marked done count.
 */
export const MAX_SETS = 12;
const DEFAULT_SETS = 3;

type Aggregates = Pick<ExerciseLog, "completed" | "actual_sets" | "actual_reps" | "actual_weight_kg">;

/** `"60.00"` -> `"60"`, `"62.5"` -> `"62.5"`; anything non-numeric -> null. */
export function formatWeight(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : null;
}

/**
 * completed  = has sets and every one is done
 * actual_sets = how many sets were done
 * actual_reps = reps of the done sets, comma separated ("10,10,9")
 * actual_weight_kg = the heaviest done set (the "top set")
 */
export function deriveAggregates(sets: ExerciseSet[]): Aggregates {
  const done = sets.filter((set) => set.completed);
  const reps = done.map((set) => (set.reps ?? "").trim()).filter((value) => value !== "");
  // formatWeight, not Number(): Number(null) and Number("") are 0, which
  // would turn "no weight typed" into a claimed 0 kg.
  const weights = done
    .map((set) => formatWeight(set.weight_kg))
    .filter((value): value is string => value !== null)
    .map(Number);

  return {
    completed: sets.length > 0 && done.length === sets.length,
    actual_sets: done.length,
    actual_reps: reps.length ? reps.join(",") : null,
    actual_weight_kg: weights.length ? String(Math.max(...weights)) : null,
  };
}

/** Upper bound of the planned rep range ("8-10" -> "10"), used to fill a set the user just ticked. */
export function plannedRepsFill(exercise: RoutineExercise | undefined): string | null {
  const range = parseRepRange(exercise?.reps);
  return range ? String(range.max) : null;
}

/** Fresh, untouched sets for an exercise: planned count, planned weight, nothing done yet. */
export function emptySets(exercise: RoutineExercise): ExerciseSet[] {
  const count = Math.min(MAX_SETS, Math.max(1, exercise.sets ?? DEFAULT_SETS));
  const weight = formatWeight(exercise.weight_kg);
  return Array.from({ length: count }, () => ({ reps: null, weight_kg: weight, completed: false }));
}

function withDerived(entry: ExerciseLog, sets: ExerciseSet[]): ExerciseLog {
  return { ...entry, sets, ...deriveAggregates(sets) };
}

export function buildExerciseLog(exercise: RoutineExercise): ExerciseLog {
  return withDerived(
    {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      source_external_id: exercise.source_external_id || undefined,
      completed: false,
      actual_sets: 0,
      actual_reps: null,
      actual_weight_kg: null,
      note: "",
    },
    emptySets(exercise),
  );
}

/** Sets reconstructed from a log saved before per-set logging existed. */
function setsFromAggregates(entry: ExerciseLog, exercise: RoutineExercise | undefined): ExerciseSet[] {
  const count = Math.min(MAX_SETS, Math.max(1, entry.actual_sets ?? exercise?.sets ?? 1));
  const numbers = parseAchievedNumbers(entry.actual_reps);
  // The old form prefilled reps with the planned range ("8-10"), which says
  // nothing about what was actually done: only trust a single number or one per set.
  const isRange = /\d\s*-\s*\d/.test(entry.actual_reps ?? "");
  const repsFor = (index: number): string | null => {
    if (isRange) return null;
    if (numbers.length === 1) return String(numbers[0]);
    if (numbers.length === count) return String(numbers[index]);
    return null;
  };
  const weight = formatWeight(entry.actual_weight_kg);
  return Array.from({ length: count }, (_, index) => ({
    reps: repsFor(index),
    weight_kg: weight,
    completed: entry.completed,
  }));
}

/** Makes sure the entry has `sets` (converting older logs) and consistent aggregates. */
export function ensureSets(entry: ExerciseLog, exercise?: RoutineExercise): ExerciseLog {
  if (entry.sets && entry.sets.length > 0) return withDerived(entry, entry.sets);
  const sets = setsFromAggregates(entry, exercise);
  // Old aggregates were the user's own words: keep them for untouched conversions.
  return { ...entry, sets };
}

export function updateSet(
  entry: ExerciseLog,
  index: number,
  patch: Partial<ExerciseSet>,
  exercise?: RoutineExercise,
): ExerciseLog {
  const sets = (entry.sets ?? []).map((set, i) => {
    if (i !== index) return set;
    const next = { ...set, ...patch };
    // Ticking a set with no reps typed means "as prescribed": fill the top of the range.
    if (patch.completed === true && !(next.reps ?? "").trim()) {
      next.reps = plannedRepsFill(exercise);
    }
    return next;
  });
  return withDerived(entry, sets);
}

export function addSet(entry: ExerciseLog): ExerciseLog {
  const sets = entry.sets ?? [];
  if (sets.length >= MAX_SETS) return entry;
  const previous = sets[sets.length - 1];
  return withDerived(entry, [
    ...sets,
    { reps: null, weight_kg: previous?.weight_kg ?? null, completed: false },
  ]);
}

export function removeLastSet(entry: ExerciseLog): ExerciseLog {
  const sets = entry.sets ?? [];
  if (sets.length <= 1) return entry;
  return withDerived(entry, sets.slice(0, -1));
}

/** `"62,5"` / `"62.5kg"` / `" 60 "` -> `"62.5"` / `"62.5"` / `"60"`; 2 decimals max; junk -> null. */
function sanitizeWeight(value: string | null): string | null {
  if (value === null) return null;
  const cleaned = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  if (cleaned === "" || !Number.isFinite(n)) return null;
  return String(Math.round(n * 100) / 100);
}

/** Digits only ("10 reps" -> "10"); reps are whole numbers. */
function sanitizeReps(value: string | null): string | null {
  if (value === null) return null;
  const digits = value.replace(/\D/g, "").slice(0, 3);
  return digits === "" ? null : digits;
}

/**
 * Cleans what the user typed right before saving. The API rejects a weight
 * with more than 2 decimals or with text in it, and one rejected log blocks
 * the whole offline sync queue behind it -- so nothing malformed may leave
 * the device. Aggregates are re-derived from the cleaned sets.
 */
export function sanitizeExerciseLog(entry: ExerciseLog): ExerciseLog {
  if (!entry.sets) return entry;
  const sets = entry.sets.slice(0, MAX_SETS).map((set) => ({
    reps: sanitizeReps(set.reps),
    weight_kg: sanitizeWeight(set.weight_kg),
    completed: set.completed,
  }));
  return withDerived(entry, sets);
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { clearExercisePolicy, setExercisePolicy, suggestNext, type ProgressionPolicy } from "@/lib/progression";
import type { RoutineExercise } from "@/types/routine";

/**
 * Live suggestion for one routine exercise, recomputed whenever the
 * underlying Dexie data changes (a new log saved, the catalog re-synced, the
 * policy preference changed). Fully offline: `suggestNext` only reads local
 * Dexie tables.
 */
export function useProgressionSuggestion(exercise: RoutineExercise) {
  return useLiveQuery(
    () =>
      suggestNext({
        sourceExternalId: exercise.source_external_id,
        plannedReps: exercise.reps || null,
        plannedSets: exercise.sets,
      }),
    [exercise.source_external_id, exercise.reps, exercise.sets],
  );
}

export function useSetProgressionPolicy() {
  return (sourceExternalId: string, policy: ProgressionPolicy) =>
    setExercisePolicy(sourceExternalId, policy);
}

/** The policy the user picked for this exercise, `null` while it follows the automatic default. */
export function useExercisePolicyPref(sourceExternalId: string | null | undefined) {
  return useLiveQuery(
    async () => (sourceExternalId ? ((await db.progressionPrefs.get(sourceExternalId))?.policy ?? null) : null),
    [sourceExternalId],
    null,
  );
}

export function useChangeProgressionPolicy() {
  return (sourceExternalId: string, policy: ProgressionPolicy | "auto") =>
    policy === "auto" ? clearExercisePolicy(sourceExternalId) : setExercisePolicy(sourceExternalId, policy);
}

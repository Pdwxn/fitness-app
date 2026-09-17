"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { setExercisePolicy, suggestNext, type ProgressionPolicy } from "@/lib/progression";
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

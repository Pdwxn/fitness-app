"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, getMeta, META_KEYS } from "@/lib/db";
import type { CatalogFilters, Exercise } from "@/types/exercise";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matches(exercise: Exercise, filters: CatalogFilters): boolean {
  const search = normalize(filters.search);
  if (search && !normalize(exercise.name).includes(search)) return false;

  const muscle = normalize(filters.muscle);
  if (
    muscle &&
    ![...exercise.primary_muscles, ...exercise.secondary_muscles]
      .map(normalize)
      .some((m) => m.includes(muscle))
  ) {
    return false;
  }

  const equipment = normalize(filters.equipment);
  if (equipment && normalize(exercise.equipment) !== equipment) return false;

  const category = normalize(filters.category);
  if (category && normalize(exercise.category) !== category) return false;

  return true;
}

/**
 * Reads the offline exercise catalog (Dexie) and filters it in memory.
 * The dataset (~873 rows) is small enough that in-memory filtering beats
 * building compound Dexie queries for the free-text search.
 */
export function useExerciseCatalog(filters: CatalogFilters) {
  const all = useLiveQuery(() => db.exercises.toArray(), []);

  const exercises = useMemo(() => {
    if (!all) return [];
    return all.filter((exercise) => matches(exercise, filters));
  }, [all, filters]);

  const facets = useMemo(() => {
    const equipment = new Set<string>();
    const category = new Set<string>();
    const muscle = new Set<string>();
    for (const ex of all ?? []) {
      if (ex.equipment) equipment.add(ex.equipment);
      if (ex.category) category.add(ex.category);
      ex.primary_muscles.forEach((m) => m && muscle.add(m));
    }
    return {
      equipment: [...equipment].sort(),
      category: [...category].sort(),
      muscle: [...muscle].sort(),
    };
  }, [all]);

  return {
    exercises,
    facets,
    total: all?.length ?? 0,
    isLoading: all === undefined,
    isEmpty: all !== undefined && all.length === 0,
  };
}

export function useCatalogSyncStatus() {
  const syncedAt = useLiveQuery(async () => getMeta(META_KEYS.exercisesSyncedAt), []);
  const count = useLiveQuery(() => db.exercises.count(), []);

  return {
    lastSyncedAt: syncedAt ?? null,
    count: count ?? 0,
    neverSynced: syncedAt === null && count === 0,
    isLoading: syncedAt === undefined || count === undefined,
  };
}

"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";

/**
 * A routine that was built offline and is waiting to be pushed to the backend.
 * The builder only ever queues one at a time.
 */
export function usePendingRoutine() {
  const item = useLiveQuery(() => db.pendingRoutines.orderBy("createdAt").last(), []);
  return {
    pendingRoutine: item ?? null,
    hasPending: Boolean(item),
    isLoading: item === undefined,
  };
}

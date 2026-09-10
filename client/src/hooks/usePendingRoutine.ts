"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";

/**
 * A routine that was built offline and is waiting to be pushed to the backend.
 * The builder only ever queues one at a time.
 *
 * `.toArray()` returns `[]` for an empty table and `undefined` only while the
 * query is still running — so `isLoading` never gets stuck (`.last()` would
 * return `undefined` for both cases).
 */
export function usePendingRoutine() {
  const items = useLiveQuery(
    () => db.pendingRoutines.orderBy("createdAt").toArray(),
    [],
  );

  return {
    pendingRoutine: items && items.length > 0 ? items[items.length - 1] : null,
    hasPending: (items?.length ?? 0) > 0,
    isLoading: items === undefined,
  };
}

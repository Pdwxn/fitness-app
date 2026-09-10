import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/authenticated-client";
import { db, getMeta, META_KEYS } from "@/lib/db";
import type { Exercise } from "@/types/exercise";
import type { ManualRoutineDraft, Routine } from "@/types/routine";

const fetchFullExerciseCatalog = vi.fn();
const createManualRoutine = vi.fn();

vi.mock("@/lib/api/exercises", () => ({
  fetchFullExerciseCatalog: () => fetchFullExerciseCatalog(),
}));
vi.mock("@/lib/api/routines", () => ({
  createManualRoutine: (draft: ManualRoutineDraft) => createManualRoutine(draft),
}));

// Imported after the mocks are registered.
const { syncExerciseCatalog, syncPendingRoutines } = await import("@/lib/sync");

function makeExercise(id: string): Exercise {
  return {
    external_id: id,
    name: `Exercise ${id}`,
    force: "",
    level: "",
    mechanic: "",
    equipment: "barbell",
    primary_muscles: ["chest"],
    secondary_muscles: [],
    category: "strength",
    instructions: "",
    image_url: "",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const draft: ManualRoutineDraft = {
  weeks: [
    {
      week_number: 1,
      focus: "",
      notes: "",
      days: [
        {
          day_number: 1,
          day_name: "Push",
          is_rest_day: false,
          exercises: [
            {
              name: "Bench Press",
              external_id: "Bench_Press",
              muscle_group: "chest",
              sets: 4,
              reps: "8",
              weight_kg: null,
              rest_seconds: 90,
              order: 1,
            },
          ],
        },
      ],
    },
  ],
};

const fakeRoutine = { id: "r1", source: "manual", is_active: true } as unknown as Routine;

beforeEach(async () => {
  fetchFullExerciseCatalog.mockReset();
  createManualRoutine.mockReset();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("syncExerciseCatalog", () => {
  it("downloads the catalog into Dexie and records the timestamp", async () => {
    fetchFullExerciseCatalog.mockResolvedValue([makeExercise("a"), makeExercise("b")]);

    const ok = await syncExerciseCatalog(true);

    expect(ok).toBe(true);
    expect(await db.exercises.count()).toBe(2);
    expect(await getMeta(META_KEYS.exercisesSyncedAt)).not.toBeNull();
  });

  it("returns false and keeps the old catalog on network failure", async () => {
    await db.exercises.bulkPut([makeExercise("old")]);
    fetchFullExerciseCatalog.mockRejectedValue(new Error("network"));

    const ok = await syncExerciseCatalog(true);

    expect(ok).toBe(false);
    expect(await db.exercises.count()).toBe(1);
  });

  it("skips a recent sync unless forced", async () => {
    await db.exercises.bulkPut([makeExercise("x")]);
    await db.meta.put({ key: META_KEYS.exercisesSyncedAt, value: new Date().toISOString() });

    const ok = await syncExerciseCatalog(false);

    expect(ok).toBe(true);
    expect(fetchFullExerciseCatalog).not.toHaveBeenCalled();
  });
});

describe("syncPendingRoutines", () => {
  it("uploads a queued routine and removes it on success", async () => {
    await db.pendingRoutines.add({ id: "p1", payload: draft, createdAt: "2026-01-01T00:00:00Z" });
    createManualRoutine.mockResolvedValue(fakeRoutine);

    const ok = await syncPendingRoutines();

    expect(ok).toBe(true);
    expect(await db.pendingRoutines.count()).toBe(0);
    expect(await db.routineCache.get("r1")).toBeTruthy();
  });

  it("drops a queued routine the server rejects with 4xx", async () => {
    await db.pendingRoutines.add({ id: "p1", payload: draft, createdAt: "2026-01-01T00:00:00Z" });
    createManualRoutine.mockRejectedValue(new ApiError(400, "bad payload", "invalid"));

    const ok = await syncPendingRoutines();

    expect(ok).toBe(false);
    expect(await db.pendingRoutines.count()).toBe(0);
  });

  it("keeps a queued routine on a network error", async () => {
    await db.pendingRoutines.add({ id: "p1", payload: draft, createdAt: "2026-01-01T00:00:00Z" });
    createManualRoutine.mockRejectedValue(new Error("offline"));

    const ok = await syncPendingRoutines();

    expect(ok).toBe(false);
    expect(await db.pendingRoutines.count()).toBe(1);
  });

  it("no-ops with an empty queue", async () => {
    expect(await syncPendingRoutines()).toBe(true);
  });
});

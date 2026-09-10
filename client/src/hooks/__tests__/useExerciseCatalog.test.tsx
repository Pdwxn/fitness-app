import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { db } from "@/lib/db";
import { EMPTY_CATALOG_FILTERS, type Exercise } from "@/types/exercise";

function ex(overrides: Partial<Exercise>): Exercise {
  return {
    external_id: overrides.name ?? "x",
    name: "x",
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
    ...overrides,
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  await db.exercises.bulkPut([
    ex({ external_id: "1", name: "Barbell Bench Press", equipment: "barbell", primary_muscles: ["chest"], category: "strength" }),
    ex({ external_id: "2", name: "Dumbbell Curl", equipment: "dumbbell", primary_muscles: ["biceps"], category: "strength" }),
    ex({ external_id: "3", name: "Running", equipment: "body only", primary_muscles: ["quadriceps"], category: "cardio" }),
  ]);
});

describe("useExerciseCatalog", () => {
  it("returns everything with empty filters", async () => {
    const { result } = renderHook(() => useExerciseCatalog(EMPTY_CATALOG_FILTERS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exercises).toHaveLength(3);
    expect(result.current.total).toBe(3);
  });

  it("filters by name (case-insensitive substring)", async () => {
    const { result } = renderHook(() =>
      useExerciseCatalog({ ...EMPTY_CATALOG_FILTERS, search: "curl" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exercises.map((e) => e.name)).toEqual(["Dumbbell Curl"]);
  });

  it("filters by muscle and equipment", async () => {
    const { result } = renderHook(() =>
      useExerciseCatalog({ ...EMPTY_CATALOG_FILTERS, muscle: "chest" }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exercises.map((e) => e.name)).toEqual(["Barbell Bench Press"]);
  });

  it("exposes sorted facets", async () => {
    const { result } = renderHook(() => useExerciseCatalog(EMPTY_CATALOG_FILTERS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.facets.category).toEqual(["cardio", "strength"]);
    expect(result.current.facets.equipment).toEqual(["barbell", "body only", "dumbbell"]);
  });

  it("reports an empty catalog", async () => {
    await db.exercises.clear();
    const { result } = renderHook(() => useExerciseCatalog(EMPTY_CATALOG_FILTERS));
    await waitFor(() => expect(result.current.isEmpty).toBe(true));
  });
});

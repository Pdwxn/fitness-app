import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  computeSuggestion,
  defaultPolicyForExperience,
  getExerciseHistory,
  getExercisePolicy,
  getIncrementKg,
  parseAchievedNumbers,
  parseRepRange,
  setExercisePolicy,
  suggestNext,
  type ComputeSuggestionInput,
} from "@/lib/progression";
import type { ExerciseLog } from "@/types/progress";
import type { DailyLog } from "@/types/progress";

function makeEntry(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    exercise_id: "re-1",
    exercise_name: "Bench Press",
    source_external_id: "bench-press",
    completed: true,
    actual_sets: 4,
    actual_reps: "10",
    actual_weight_kg: "60.00",
    note: "",
    ...overrides,
  };
}

function baseInput(overrides: Partial<ComputeSuggestionInput> = {}): ComputeSuggestionInput {
  return {
    policy: "linear",
    equipment: "barbell",
    plannedReps: "8-10",
    plannedSets: 4,
    lastEntry: makeEntry(),
    hasCatalogMatch: true,
    ...overrides,
  };
}

describe("getIncrementKg", () => {
  it("returns the barbell increment", () => {
    expect(getIncrementKg("barbell")).toBe(2.5);
  });

  it("is case/whitespace insensitive", () => {
    expect(getIncrementKg("  Dumbbell ")).toBe(2);
  });

  it("returns null for unlisted or bodyweight/cardio equipment", () => {
    expect(getIncrementKg("body weight")).toBeNull();
    expect(getIncrementKg("stationary bike")).toBeNull();
    expect(getIncrementKg(null)).toBeNull();
    expect(getIncrementKg("")).toBeNull();
  });
});

describe("defaultPolicyForExperience", () => {
  it("maps intermediate/advanced to double", () => {
    expect(defaultPolicyForExperience("intermediate")).toBe("double");
    expect(defaultPolicyForExperience("advanced")).toBe("double");
  });

  it("falls back to linear for beginner, unset, or unknown", () => {
    expect(defaultPolicyForExperience("beginner")).toBe("linear");
    expect(defaultPolicyForExperience(undefined)).toBe("linear");
    expect(defaultPolicyForExperience(null)).toBe("linear");
    expect(defaultPolicyForExperience("")).toBe("linear");
  });
});

describe("parseRepRange", () => {
  it("parses a range", () => {
    expect(parseRepRange("8-10")).toEqual({ min: 8, max: 10 });
  });

  it("normalizes a reversed range", () => {
    expect(parseRepRange("10-8")).toEqual({ min: 8, max: 10 });
  });

  it("parses a single number as min == max", () => {
    expect(parseRepRange("12")).toEqual({ min: 12, max: 12 });
  });

  it("tolerates spaces around the dash", () => {
    expect(parseRepRange("8 - 10")).toEqual({ min: 8, max: 10 });
  });

  it("returns null for unparseable text", () => {
    expect(parseRepRange("AMRAP")).toBeNull();
    expect(parseRepRange("30s")).toBeNull();
    expect(parseRepRange(null)).toBeNull();
    expect(parseRepRange("")).toBeNull();
  });
});

describe("parseAchievedNumbers", () => {
  it("extracts every number", () => {
    expect(parseAchievedNumbers("8,9,10")).toEqual([8, 9, 10]);
  });

  it("returns an empty array when there is nothing to parse", () => {
    expect(parseAchievedNumbers(null)).toEqual([]);
    expect(parseAchievedNumbers("")).toEqual([]);
    expect(parseAchievedNumbers("fallé")).toEqual([]);
  });
});

describe("computeSuggestion", () => {
  it("returns no_catalog_match when there is no stable identity", () => {
    const result = computeSuggestion(baseInput({ hasCatalogMatch: false }));
    expect(result).toEqual({ policy: "off", kind: "no_catalog_match" });
  });

  it("returns policy_off when the user disabled it for this exercise", () => {
    const result = computeSuggestion(baseInput({ policy: "off" }));
    expect(result).toEqual({ policy: "off", kind: "policy_off" });
  });

  it("returns no_history with no past log", () => {
    const result = computeSuggestion(baseInput({ lastEntry: null }));
    expect(result.kind).toBe("no_history");
  });

  it("returns unavailable_equipment when the equipment has no increment", () => {
    const result = computeSuggestion(baseInput({ equipment: "body weight" }));
    expect(result.kind).toBe("unavailable_equipment");
  });

  it("returns unavailable_equipment when the planned reps can't be parsed", () => {
    const result = computeSuggestion(baseInput({ plannedReps: "AMRAP" }));
    expect(result.kind).toBe("unavailable_equipment");
  });

  it("repeats when the last session was not marked completed", () => {
    const result = computeSuggestion(
      baseInput({ lastEntry: makeEntry({ completed: false, actual_reps: "10" }) }),
    );
    expect(result.kind).toBe("repeat_incomplete_sets");
  });

  it("double policy repeats when fewer sets than planned were logged, even if reps hit the ceiling", () => {
    const result = computeSuggestion(
      baseInput({
        policy: "double",
        plannedSets: 4,
        lastEntry: makeEntry({ actual_sets: 2, actual_reps: "10" }),
      }),
    );
    expect(result.kind).toBe("repeat_incomplete_sets");
  });

  it("linear policy does not care about set count, only the ceiling", () => {
    const result = computeSuggestion(
      baseInput({
        policy: "linear",
        plannedSets: 4,
        lastEntry: makeEntry({ actual_sets: 2, actual_reps: "10" }),
      }),
    );
    expect(result.kind).toBe("increase_weight");
  });

  it("repeats when actual_reps is unparseable", () => {
    const result = computeSuggestion(baseInput({ lastEntry: makeEntry({ actual_reps: "" }) }));
    expect(result.kind).toBe("repeat_missed_reps");
  });

  it("suggests increasing weight when every set hit the ceiling (honest reading: all, not just one)", () => {
    const result = computeSuggestion(
      baseInput({ lastEntry: makeEntry({ actual_reps: "10,10,9,10" }) }),
    );
    expect(result.kind).toBe("repeat_missed_reps"); // the 9 fell short of the max (10)
  });

  it("increase_weight computes the next weight from the increment table", () => {
    const result = computeSuggestion(
      baseInput({
        equipment: "dumbbell",
        lastEntry: makeEntry({ actual_reps: "10,10,10,10", actual_weight_kg: "20.00" }),
      }),
    );
    expect(result.kind).toBe("increase_weight");
    expect(result.nextWeightKg).toBe(22);
    expect(result.params).toEqual({ increment: 2 });
  });

  it("double policy suggests increase_reps when the floor is met but not the ceiling", () => {
    const result = computeSuggestion(
      baseInput({ policy: "double", lastEntry: makeEntry({ actual_reps: "8,8,9,8" }) }),
    );
    expect(result.kind).toBe("increase_reps");
  });

  it("linear policy just repeats when the floor is met but not the ceiling (no reps-first step)", () => {
    const result = computeSuggestion(
      baseInput({ policy: "linear", lastEntry: makeEntry({ actual_reps: "8,8,9,8" }) }),
    );
    expect(result.kind).toBe("repeat_missed_reps");
  });

  it("repeats when reps fell below the floor entirely", () => {
    const result = computeSuggestion(
      baseInput({ policy: "double", lastEntry: makeEntry({ actual_reps: "5,6,5,6" }) }),
    );
    expect(result.kind).toBe("repeat_missed_reps");
  });
});

describe("getExerciseHistory / getExercisePolicy / setExercisePolicy (Dexie-backed)", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  function makeLog(overrides: Partial<DailyLog> = {}): DailyLog {
    return {
      id: crypto.randomUUID(),
      routine_day_id: "day-1",
      date: "2026-01-01",
      completed: true,
      day_note: "",
      exercises_done: [makeEntry()],
      ...overrides,
    };
  }

  it("getExerciseHistory returns entries matching the source_external_id, newest first", async () => {
    await db.dailyLogs.bulkAdd([
      makeLog({ id: "l1", date: "2026-01-01", exercises_done: [makeEntry({ actual_reps: "8" })] }),
      makeLog({ id: "l2", date: "2026-01-08", exercises_done: [makeEntry({ actual_reps: "10" })] }),
      makeLog({
        id: "l3",
        date: "2026-01-05",
        exercises_done: [makeEntry({ source_external_id: "other-exercise" })],
      }),
    ]);

    const history = await getExerciseHistory("bench-press");

    expect(history).toHaveLength(2);
    expect(history[0].actual_reps).toBe("10"); // 2026-01-08, newest
    expect(history[1].actual_reps).toBe("8");
  });

  it("getExerciseHistory returns an empty array for a blank id", async () => {
    expect(await getExerciseHistory("")).toEqual([]);
  });

  it("getExercisePolicy defaults from experience level when there is no override", async () => {
    expect(await getExercisePolicy("bench-press")).toBe("linear");
  });

  it("setExercisePolicy persists an override that getExercisePolicy then returns", async () => {
    await setExercisePolicy("bench-press", "off");
    expect(await getExercisePolicy("bench-press")).toBe("off");
  });

  it("suggestNext orchestrates policy + catalog + history end to end", async () => {
    await db.exercises.put({
      external_id: "bench-press",
      name: "Bench Press",
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
    });
    await db.dailyLogs.add(
      makeLog({ exercises_done: [makeEntry({ actual_reps: "10,10,10,10", actual_weight_kg: "60.00" })] }),
    );

    const result = await suggestNext({
      sourceExternalId: "bench-press",
      plannedReps: "8-10",
      plannedSets: 4,
    });

    expect(result.kind).toBe("increase_weight");
    expect(result.nextWeightKg).toBe(62.5);
  });

  it("suggestNext returns no_catalog_match for a blank source_external_id", async () => {
    const result = await suggestNext({ sourceExternalId: "", plannedReps: "8-10", plannedSets: 4 });
    expect(result).toEqual({ policy: "off", kind: "no_catalog_match" });
  });
});

import { describe, expect, it } from "vitest";

import { computeSuggestion } from "@/lib/progression";
import {
  addSet,
  buildExerciseLog,
  deriveAggregates,
  emptySets,
  ensureSets,
  MAX_SETS,
  plannedRepsFill,
  removeLastSet,
  sanitizeExerciseLog,
  updateSet,
} from "@/lib/setLog";
import type { ExerciseLog, ExerciseSet } from "@/types/progress";
import type { RoutineExercise } from "@/types/routine";

const done = (reps: string | null, weight: string | null): ExerciseSet => ({ reps, weight_kg: weight, completed: true });
const pending = (reps: string | null, weight: string | null): ExerciseSet => ({ reps, weight_kg: weight, completed: false });

function exercise(overrides: Partial<RoutineExercise> = {}): RoutineExercise {
  return {
    id: "e1",
    name: "Bench Press",
    source_external_id: "bench",
    sets: 3,
    reps: "8-10",
    weight_kg: "60.00",
    ...overrides,
  } as unknown as RoutineExercise;
}

function legacy(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    exercise_id: "e1",
    exercise_name: "Bench Press",
    completed: false,
    actual_sets: 3,
    actual_reps: "8-10",
    actual_weight_kg: "60.00",
    note: "",
    ...overrides,
  };
}

describe("deriveAggregates", () => {
  it("summarizes a fully done exercise", () => {
    expect(deriveAggregates([done("10", "60"), done("10", "60"), done("9", "60")])).toEqual({
      completed: true,
      actual_sets: 3,
      actual_reps: "10,10,9",
      actual_weight_kg: "60",
    });
  });

  it("only counts sets the user ticked (honest reading)", () => {
    expect(deriveAggregates([done("10", "60"), done("10", "60"), pending("6", "60")])).toEqual({
      completed: false,
      actual_sets: 2,
      actual_reps: "10,10",
      actual_weight_kg: "60",
    });
  });

  it("uses the heaviest done set as the top set", () => {
    expect(deriveAggregates([done("10", "60"), done("8", "70"), pending("5", "90")]).actual_weight_kg).toBe("70");
  });

  it("nothing done -> nothing claimed", () => {
    expect(deriveAggregates([pending("10", "60"), pending(null, "60")])).toEqual({
      completed: false,
      actual_sets: 0,
      actual_reps: null,
      actual_weight_kg: null,
    });
  });

  it("skips blank reps and non-numeric weights instead of inventing values", () => {
    const result = deriveAggregates([done("", "abc"), done("10", null)]);
    expect(result.actual_reps).toBe("10");
    expect(result.actual_weight_kg).toBeNull();
    expect(result.actual_sets).toBe(2);
  });

  it("no sets is never 'completed'", () => {
    expect(deriveAggregates([]).completed).toBe(false);
  });
});

describe("emptySets / buildExerciseLog", () => {
  it("creates the planned number of untouched sets with the planned weight", () => {
    expect(emptySets(exercise())).toEqual([pending(null, "60"), pending(null, "60"), pending(null, "60")]);
  });

  it("falls back to 3 sets, at least 1, at most MAX_SETS", () => {
    expect(emptySets(exercise({ sets: null }))).toHaveLength(3);
    expect(emptySets(exercise({ sets: 0 }))).toHaveLength(1);
    expect(emptySets(exercise({ sets: 99 }))).toHaveLength(MAX_SETS);
  });

  it("no planned weight -> empty weight", () => {
    expect(emptySets(exercise({ weight_kg: null }))[0].weight_kg).toBeNull();
  });

  it("a new log starts with the aggregates at zero and keeps the catalog id", () => {
    const log = buildExerciseLog(exercise());
    expect(log).toMatchObject({
      exercise_id: "e1",
      source_external_id: "bench",
      completed: false,
      actual_sets: 0,
      actual_reps: null,
      actual_weight_kg: null,
    });
    expect(log.sets).toHaveLength(3);
  });
});

describe("updateSet", () => {
  const fresh = () => buildExerciseLog(exercise());

  it("ticking a set with no reps fills the top of the planned range", () => {
    const log = updateSet(fresh(), 0, { completed: true }, exercise());
    expect(log.sets![0]).toEqual(done("10", "60"));
    expect(log).toMatchObject({ actual_sets: 1, actual_reps: "10", completed: false });
  });

  it("never overwrites reps the user typed", () => {
    let log = updateSet(fresh(), 1, { reps: "7" }, exercise());
    log = updateSet(log, 1, { completed: true }, exercise());
    expect(log.sets![1].reps).toBe("7");
    expect(log.actual_reps).toBe("7");
  });

  it("a plan without a parsable range leaves reps blank when ticked", () => {
    const log = updateSet(buildExerciseLog(exercise({ reps: "AMRAP" })), 0, { completed: true }, exercise({ reps: "AMRAP" }));
    expect(log.sets![0].reps).toBeNull();
  });

  it("ticking every set completes the exercise, unticking one undoes it", () => {
    let log = fresh();
    for (const i of [0, 1, 2]) log = updateSet(log, i, { completed: true }, exercise());
    expect(log.completed).toBe(true);
    expect(log.actual_reps).toBe("10,10,10");

    log = updateSet(log, 2, { completed: false }, exercise());
    expect(log.completed).toBe(false);
    expect(log.actual_sets).toBe(2);
  });

  it("changing the weight of a done set moves the top set", () => {
    let log = updateSet(fresh(), 0, { completed: true }, exercise());
    log = updateSet(log, 0, { weight_kg: "65" }, exercise());
    expect(log.actual_weight_kg).toBe("65");
  });

  it("does not mutate the previous entry", () => {
    const before = fresh();
    updateSet(before, 0, { completed: true }, exercise());
    expect(before.sets![0].completed).toBe(false);
  });
});

describe("addSet / removeLastSet", () => {
  it("adds a set repeating the previous weight, up to MAX_SETS", () => {
    let log = updateSet(buildExerciseLog(exercise()), 2, { weight_kg: "62.5" }, exercise());
    log = addSet(log);
    expect(log.sets).toHaveLength(4);
    expect(log.sets![3]).toEqual(pending(null, "62.5"));

    for (let i = 0; i < 20; i += 1) log = addSet(log);
    expect(log.sets).toHaveLength(MAX_SETS);
  });

  it("removes the last set but always keeps one", () => {
    let log = buildExerciseLog(exercise({ sets: 2 }));
    log = removeLastSet(log);
    expect(log.sets).toHaveLength(1);
    expect(removeLastSet(log).sets).toHaveLength(1);
  });

  it("removing the only unticked set can complete the exercise", () => {
    let log = buildExerciseLog(exercise({ sets: 2 }));
    log = updateSet(log, 0, { completed: true }, exercise());
    expect(log.completed).toBe(false);
    expect(removeLastSet(log).completed).toBe(true);
  });
});

describe("ensureSets (logs saved before per-set logging)", () => {
  it("builds one row per set from the totals", () => {
    const log = ensureSets(legacy({ completed: true, actual_sets: 4, actual_reps: "10", actual_weight_kg: "60.00" }), exercise());
    expect(log.sets).toEqual([done("10", "60"), done("10", "60"), done("10", "60"), done("10", "60")]);
  });

  it("reads one number per set when the list matches the set count", () => {
    const log = ensureSets(legacy({ completed: true, actual_sets: 3, actual_reps: "10,9,8" }), exercise());
    expect(log.sets!.map((s) => s.reps)).toEqual(["10", "9", "8"]);
  });

  it("ignores the old prefilled planned range ('8-10') -- it says nothing about what was done", () => {
    const log = ensureSets(legacy({ actual_reps: "8-10" }), exercise());
    expect(log.sets!.every((s) => s.reps === null)).toBe(true);
  });

  it("an unticked legacy exercise gives unticked sets", () => {
    expect(ensureSets(legacy({ completed: false }), exercise()).sets!.every((s) => !s.completed)).toBe(true);
  });

  it("leaves the user's original aggregates untouched until they edit", () => {
    const original = legacy({ completed: true, actual_sets: 3, actual_reps: "12", actual_weight_kg: "40.00" });
    const log = ensureSets(original, exercise());
    expect(log).toMatchObject({ completed: true, actual_sets: 3, actual_reps: "12", actual_weight_kg: "40.00" });
  });

  it("re-derives aggregates for an entry that already has sets", () => {
    const stale = { ...legacy({ completed: false, actual_sets: 99 }), sets: [done("10", "60"), done("10", "60")] };
    expect(ensureSets(stale, exercise())).toMatchObject({ completed: true, actual_sets: 2, actual_reps: "10,10" });
  });

  it("caps huge legacy set counts", () => {
    expect(ensureSets(legacy({ actual_sets: 50 }), exercise()).sets).toHaveLength(MAX_SETS);
  });
});

describe("sanitizeExerciseLog (nothing malformed may reach the API)", () => {
  it("fixes decimal commas and units, limits decimals, drops junk", () => {
    const log = sanitizeExerciseLog({
      ...buildExerciseLog(exercise({ sets: 4 })),
      sets: [done("10", "62,5"), done("10", "62.5kg"), done("10", "60.123"), done("10", "abc")],
    });
    expect(log.sets!.map((s) => s.weight_kg)).toEqual(["62.5", "62.5", "60.12", null]);
  });

  it("keeps reps to whole numbers", () => {
    const log = sanitizeExerciseLog({
      ...buildExerciseLog(exercise({ sets: 3 })),
      sets: [done("10 reps", "60"), done("", "60"), done("12345", "60")],
    });
    expect(log.sets!.map((s) => s.reps)).toEqual(["10", null, "123"]);
  });

  it("re-derives the aggregates from the cleaned values", () => {
    const log = sanitizeExerciseLog({
      ...buildExerciseLog(exercise({ sets: 2 })),
      sets: [done("10", "62,5"), done("9", "62,5")],
    });
    expect(log).toMatchObject({ actual_reps: "10,9", actual_weight_kg: "62.5", completed: true });
  });

  it("passes legacy entries (no sets) through", () => {
    const entry = legacy();
    expect(sanitizeExerciseLog(entry)).toBe(entry);
  });
});

describe("plannedRepsFill", () => {
  it("top of the range, single number, or nothing", () => {
    expect(plannedRepsFill(exercise({ reps: "6-8" }))).toBe("8");
    expect(plannedRepsFill(exercise({ reps: "12" }))).toBe("12");
    expect(plannedRepsFill(exercise({ reps: "" }))).toBeNull();
    expect(plannedRepsFill(undefined)).toBeNull();
  });
});

describe("a per-set log still drives the progression engine", () => {
  const plan = { policy: "linear" as const, equipment: "barbell", plannedReps: "8-10", plannedSets: 3, hasCatalogMatch: true };

  it("all sets at the ceiling -> add weight", () => {
    let log = buildExerciseLog(exercise());
    for (const i of [0, 1, 2]) log = updateSet(log, i, { completed: true }, exercise());
    const suggestion = computeSuggestion({ ...plan, lastEntry: sanitizeExerciseLog(log) });
    expect(suggestion).toMatchObject({ kind: "increase_weight", nextWeightKg: 62.5 });
  });

  it("one set short of the ceiling is not enough, even though the others were", () => {
    let log = buildExerciseLog(exercise());
    log = updateSet(log, 0, { completed: true }, exercise());
    log = updateSet(log, 1, { completed: true }, exercise());
    log = updateSet(log, 2, { reps: "8", completed: true }, exercise());
    expect(computeSuggestion({ ...plan, lastEntry: sanitizeExerciseLog(log) }).kind).toBe("repeat_missed_reps");
  });

  it("a skipped set means the exercise wasn't completed -> repeat", () => {
    let log = buildExerciseLog(exercise());
    log = updateSet(log, 0, { completed: true }, exercise());
    log = updateSet(log, 1, { completed: true }, exercise());
    expect(computeSuggestion({ ...plan, lastEntry: sanitizeExerciseLog(log) }).kind).toBe("repeat_incomplete_sets");
  });
});

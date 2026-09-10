import { beforeEach, describe, expect, it } from "vitest";

import {
  useRoutineBuilderStore,
  validateDraft,
} from "@/store/routineBuilderStore";
import type { Exercise } from "@/types/exercise";

const store = () => useRoutineBuilderStore.getState();

const catalogExercise: Exercise = {
  external_id: "Bench_Press",
  name: "Bench Press",
  force: "push",
  level: "beginner",
  mechanic: "compound",
  equipment: "barbell",
  primary_muscles: ["chest"],
  secondary_muscles: ["triceps"],
  category: "strength",
  instructions: "",
  image_url: "",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  useRoutineBuilderStore.setState({ hydrated: true });
  store().reset();
});

describe("routineBuilderStore", () => {
  it("starts with one week and one day", () => {
    const { draft } = store();
    expect(draft.weeks).toHaveLength(1);
    expect(draft.weeks[0].days).toHaveLength(1);
    expect(draft.weeks[0].week_number).toBe(1);
  });

  it("adds an exercise from the catalog with its external_id", () => {
    store().addExercise(0, 0, catalogExercise);
    const exercise = store().draft.weeks[0].days[0].exercises[0];
    expect(exercise.name).toBe("Bench Press");
    expect(exercise.external_id).toBe("Bench_Press");
    expect(exercise.order).toBe(1);
  });

  it("adds a custom (blank) exercise", () => {
    store().addExercise(0, 0);
    const exercise = store().draft.weeks[0].days[0].exercises[0];
    expect(exercise.name).toBe("");
    expect(exercise.external_id).toBe("");
  });

  it("removes an exercise and renumbers order", () => {
    store().addExercise(0, 0, catalogExercise);
    store().addExercise(0, 0);
    store().addExercise(0, 0);
    store().removeExercise(0, 0, 0);
    const orders = store().draft.weeks[0].days[0].exercises.map((e) => e.order);
    expect(orders).toEqual([1, 2]);
  });

  it("moveExercise swaps neighbours and recomputes order", () => {
    store().addExercise(0, 0, { ...catalogExercise, name: "A", external_id: "A" });
    store().addExercise(0, 0, { ...catalogExercise, name: "B", external_id: "B" });
    store().moveExercise(0, 0, 1, "up");
    const day = store().draft.weeks[0].days[0];
    expect(day.exercises.map((e) => e.name)).toEqual(["B", "A"]);
    expect(day.exercises.map((e) => e.order)).toEqual([1, 2]);
  });

  it("moveExercise at the edges is a no-op", () => {
    store().addExercise(0, 0);
    store().addExercise(0, 0);
    store().moveExercise(0, 0, 0, "up");
    store().moveExercise(0, 0, 1, "down");
    expect(store().draft.weeks[0].days[0].exercises).toHaveLength(2);
  });

  it("adds and removes weeks, staying within 1..4 and renumbering", () => {
    store().addWeek();
    store().addWeek();
    store().addWeek();
    store().addWeek(); // over the cap -> ignored
    expect(store().draft.weeks).toHaveLength(4);
    expect(store().draft.weeks.map((w) => w.week_number)).toEqual([1, 2, 3, 4]);
    store().removeWeek(1);
    expect(store().draft.weeks.map((w) => w.week_number)).toEqual([1, 2, 3]);
  });

  it("keeps at least one week and one day", () => {
    store().removeWeek(0);
    expect(store().draft.weeks).toHaveLength(1);
    store().removeDay(0, 0);
    expect(store().draft.weeks[0].days).toHaveLength(1);
  });

  it("toggleRestDay clears exercises", () => {
    store().addExercise(0, 0, catalogExercise);
    store().toggleRestDay(0, 0);
    const day = store().draft.weeks[0].days[0];
    expect(day.is_rest_day).toBe(true);
    expect(day.exercises).toHaveLength(0);
  });

  it("reset restores the initial draft", () => {
    store().addWeek();
    store().addExercise(0, 0, catalogExercise);
    store().reset();
    expect(store().draft.weeks).toHaveLength(1);
    expect(store().draft.weeks[0].days[0].exercises).toHaveLength(0);
  });
});

describe("validateDraft", () => {
  it("flags a week with no training day", () => {
    store().setDayName(0, 0, "Push");
    store().toggleRestDay(0, 0);
    const errors = validateDraft(store().draft);
    expect(errors.some((e) => e.code === "no_training_day")).toBe(true);
  });

  it("flags a training day with no exercises", () => {
    store().setDayName(0, 0, "Push");
    const errors = validateDraft(store().draft);
    expect(errors.some((e) => e.code === "empty_training_day")).toBe(true);
  });

  it("flags an unnamed day", () => {
    store().addExercise(0, 0);
    store().setExerciseField(0, 0, 0, { name: "Squat" });
    const errors = validateDraft(store().draft);
    expect(errors.some((e) => e.code === "unnamed_day")).toBe(true);
  });

  it("passes for a complete draft", () => {
    store().setDayName(0, 0, "Push");
    store().addExercise(0, 0);
    store().setExerciseField(0, 0, 0, { name: "Bench Press" });
    expect(validateDraft(store().draft)).toHaveLength(0);
  });
});

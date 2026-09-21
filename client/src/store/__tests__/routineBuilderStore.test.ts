import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, getMeta, META_KEYS } from "@/lib/db";
import {
  useRoutineBuilderStore,
  validateDraft,
} from "@/store/routineBuilderStore";
import type { Exercise } from "@/types/exercise";
import type { Routine } from "@/types/routine";

const store = () => useRoutineBuilderStore.getState();

const existingRoutine: Routine = {
  id: "r1",
  source: "manual",
  month: null,
  year: null,
  is_active: true,
  generated_at: null,
  gemini_prompt_hash: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  weeks: [
    {
      id: "w1",
      week_number: 1,
      focus: "Base",
      notes: "",
      created_at: "",
      updated_at: "",
      days: [
        {
          id: "d1",
          day_number: 1,
          day_name: "Push",
          is_rest_day: false,
          created_at: "",
          updated_at: "",
          exercises: [
            {
              id: "e1",
              name: "Bench Press",
              muscle_group: "chest",
              source_external_id: "Bench_Press",
              sets: 4,
              reps: "8",
              weight_kg: "40.00",
              rest_seconds: 90,
              image_url: "",
              video_url: "",
              variants: [],
              instructions: "",
              search_term: "",
              order: 1,
              created_at: "",
              updated_at: "",
            },
          ],
        },
      ],
    },
  ],
};

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
  gif_url: "",
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

  it("reorderExercise moves an exercise anywhere and renumbers order", () => {
    for (const name of ["A", "B", "C", "D"]) {
      store().addExercise(0, 0, { ...catalogExercise, name, external_id: name });
    }
    store().reorderExercise(0, 0, 0, 2);
    let day = store().draft.weeks[0].days[0];
    expect(day.exercises.map((e) => e.name)).toEqual(["B", "C", "A", "D"]);
    expect(day.exercises.map((e) => e.order)).toEqual([1, 2, 3, 4]);

    store().reorderExercise(0, 0, 3, 0);
    day = store().draft.weeks[0].days[0];
    expect(day.exercises.map((e) => e.name)).toEqual(["D", "B", "C", "A"]);
  });

  it("reorderExercise ignores out-of-range or identical positions", () => {
    store().addExercise(0, 0, { ...catalogExercise, name: "A", external_id: "A" });
    store().addExercise(0, 0, { ...catalogExercise, name: "B", external_id: "B" });
    store().reorderExercise(0, 0, 0, 5);
    store().reorderExercise(0, 0, 1, 1);
    expect(store().draft.weeks[0].days[0].exercises.map((e) => e.name)).toEqual(["A", "B"]);
  });

  it("applyTemplate replaces the draft with named days and rest days", () => {
    store().applyTemplate([{ name: "Push" }, { name: "Rest", rest: true }, { name: "Pull" }]);
    const { weeks } = store().draft;
    expect(weeks).toHaveLength(1);
    expect(weeks[0].days.map((d) => [d.day_number, d.day_name, d.is_rest_day])).toEqual([
      [1, "Push", false],
      [2, "Rest", true],
      [3, "Pull", false],
    ]);
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

  it("toggleRestDay clears exercises and fills in a name if the day doesn't have one", () => {
    store().addExercise(0, 0, catalogExercise);
    store().toggleRestDay(0, 0, "Rest");
    const day = store().draft.weeks[0].days[0];
    expect(day.is_rest_day).toBe(true);
    expect(day.exercises).toHaveLength(0);
    expect(day.day_name).toBe("Rest");
  });

  it("toggleRestDay keeps an existing name", () => {
    store().setDayName(0, 0, "Active recovery");
    store().toggleRestDay(0, 0, "Rest");
    expect(store().draft.weeks[0].days[0].day_name).toBe("Active recovery");
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
    store().toggleRestDay(0, 0, "Rest");
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

describe("editing an existing routine", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await db.meta.clear();
  });

  it("startEditing loads the routine into the draft and sets editingRoutineId", () => {
    store().startEditing(existingRoutine);
    expect(store().editingRoutineId).toBe("r1");
    expect(store().draft.weeks[0].focus).toBe("Base");
    expect(store().draft.weeks[0].days[0].exercises[0]).toMatchObject({
      name: "Bench Press",
      external_id: "Bench_Press",
      sets: 4,
    });
  });

  it("does not persist edit changes to the create-flow's Dexie draft", async () => {
    // Simulate an abandoned "create" draft already on disk.
    await db.meta.put({ key: META_KEYS.routineBuilderDraft, value: JSON.stringify({ weeks: [] }) });

    store().startEditing(existingRoutine);
    store().addExercise(0, 0);

    await new Promise((resolve) => setTimeout(resolve, 500));
    const stillTheOldDraft = await getMeta(META_KEYS.routineBuilderDraft);
    expect(stillTheOldDraft).toBe(JSON.stringify({ weeks: [] }));
  });

  it("reset() clears editingRoutineId and returns to a blank draft", () => {
    store().startEditing(existingRoutine);
    store().reset();
    expect(store().editingRoutineId).toBeNull();
    expect(store().draft.weeks).toHaveLength(1);
    expect(store().draft.weeks[0].days[0].exercises).toHaveLength(0);
  });

  it("hydrate() (create flow) clears any stale editingRoutineId", async () => {
    store().startEditing(existingRoutine);
    useRoutineBuilderStore.setState({ hydrated: false });
    await store().hydrate();
    expect(store().editingRoutineId).toBeNull();
  });
});

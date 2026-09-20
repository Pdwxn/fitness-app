import { describe, expect, it } from "vitest";

import {
  analyzeProgress,
  exerciseVolume,
  periodRanges,
  strengthOptions,
  strengthSeries,
} from "@/lib/progressAnalytics";
import type { DailyLog, ExerciseLog } from "@/types/progress";
import type { Routine } from "@/types/routine";

// Mon/Wed/Fri training, week 1 starts Monday 2026-09-07 (single-week routine repeats).
const routine = {
  id: "r1",
  cycle_started_on: "2026-09-07",
  created_at: "2026-09-01T00:00:00Z",
  weeks: [
    {
      id: "w1",
      week_number: 1,
      days: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        id: `d${n}`,
        day_number: n,
        day_name: `Day ${n}`,
        is_rest_day: ![1, 3, 5].includes(n),
        exercises: n === 1 ? [{ id: "bench", muscle_group: "chest" }, { id: "row", muscle_group: "back" }] : [],
      })),
    },
  ],
} as unknown as Routine;

const entry = (id: string, name: string, sets: [string, string, boolean][]): ExerciseLog =>
  ({
    exercise_id: id,
    exercise_name: name,
    source_external_id: id,
    completed: true,
    actual_sets: null,
    actual_reps: null,
    actual_weight_kg: null,
    note: "",
    sets: sets.map(([reps, weight_kg, completed]) => ({ reps, weight_kg, completed })),
  }) as ExerciseLog;

const log = (date: string, exercises: ExerciseLog[], completed = true): DailyLog =>
  ({ id: date, routine_day_id: "d1", date, completed, day_note: "", exercises_done: exercises }) as DailyLog;

describe("exerciseVolume", () => {
  it("adds reps x weight over completed sets only", () => {
    expect(exerciseVolume(entry("bench", "Bench", [["10", "60", true], ["8", "60", true], ["10", "60", false]]))).toBe(1080);
  });

  it("reads comma decimals and rep ranges, ignoring sets without numbers", () => {
    expect(exerciseVolume(entry("x", "X", [["8-10", "62,5", true], ["", "60", true]]))).toBe(500);
  });

  it("falls back to the totals of logs saved before per-set logging", () => {
    const legacy = { exercise_id: "b", exercise_name: "B", completed: true, actual_sets: 3, actual_reps: "10,10,9", actual_weight_kg: "50.00", note: "" } as ExerciseLog;
    expect(exerciseVolume(legacy)).toBe(1450);
  });
});

describe("periodRanges", () => {
  it("uses Monday-Sunday weeks and calendar months", () => {
    const week = periodRanges("week", new Date(2026, 8, 9));
    expect([week.start.getDate(), week.end.getDate(), week.previousStart.getDate()]).toEqual([7, 13, 31]);
    const month = periodRanges("month", new Date(2026, 8, 9));
    expect([month.start.getDate(), month.end.getDate(), month.previousEnd.getMonth()]).toEqual([1, 30, 7]);
  });
});

describe("analyzeProgress", () => {
  const now = new Date(2026, 8, 16); // Wednesday of week 2
  const logs = [
    log("2026-09-14", [entry("bench", "Bench", [["10", "60", true], ["10", "60", true]]), entry("row", "Row", [["10", "40", true]])]),
    log("2026-09-07", [entry("bench", "Bench", [["10", "50", true]])]),
    log("2026-09-09", [entry("bench", "Bench", [["10", "50", true]])], false),
  ];

  it("totals this week's volume and compares it with the last one", () => {
    const { volume } = analyzeProgress(logs, routine, "week", now);
    expect(volume.total).toBe(1600);
    expect(volume.previous).toBe(500 + 500);
    expect(volume.deltaPercent).toBe(60);
    expect(volume.daily).toHaveLength(7);
    expect(volume.daily[0]).toEqual({ date: "2026-09-14", value: 1600 });
  });

  it("has no percentage to show when there is nothing to compare with", () => {
    expect(analyzeProgress(logs, routine, "week", new Date(2026, 8, 9)).volume.deltaPercent).toBeNull();
  });

  it("measures consistency over the training days that already came up", () => {
    const { workouts, consistency } = analyzeProgress(logs, routine, "week", now);
    expect(workouts.planned).toBe(3);
    expect(workouts.completed).toBe(1);
    expect(consistency).toBe(50); // Mon done, Wed (today) not yet: 1 of 2
  });

  it("counts completed sets per muscle (even in a day not marked done) and the change since last period", () => {
    const { muscles } = analyzeProgress(logs, routine, "week", now);
    expect(muscles).toEqual([
      { muscle: "chest", sets: 2, delta: 0 },
      { muscle: "back", sets: 1, delta: 1 },
    ]);
  });

  it("is empty and null-safe without logs or a routine", () => {
    const empty = analyzeProgress([], null, "month", now);
    expect(empty.volume.total).toBe(0);
    expect(empty.consistency).toBeNull();
    expect(empty.muscles).toEqual([]);
  });
});

describe("strength trend", () => {
  const logs = [
    log("2026-09-14", [entry("bench", "Bench", [["10", "60", true], ["5", "70", true], ["5", "90", false]])]),
    log("2026-09-07", [entry("bench", "Bench", [["10", "50", true]]), entry("row", "Row", [["10", "40", true]])]),
    log("2026-09-08", [entry("curl", "Curl", [["10", "", true]])]),
  ];

  it("lists exercises that were logged with a weight, most logged first", () => {
    expect(strengthOptions(logs).map((option) => option.key)).toEqual(["bench", "row"]);
  });

  it("gives the heaviest completed set per date, oldest first", () => {
    expect(strengthSeries(logs, "bench")).toEqual([
      { date: "2026-09-07", value: 50 },
      { date: "2026-09-14", value: 70 },
    ]);
  });
});

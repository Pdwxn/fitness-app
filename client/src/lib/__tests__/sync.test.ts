import { describe, it, expect } from "vitest";
import { calculateStats, mergeLogs } from "../sync";

describe("mergeLogs", () => {
  it("should prefer local when updated_at is newer", () => {
    const local = [{ id: "1", updated_at: "2026-06-23T12:00:00Z", completed: true, routine_day_id: "a", date: "2026-06-23", day_note: "", exercises_done: [] }];
    const remote = [{ id: "1", updated_at: "2026-06-22T12:00:00Z", completed: false, routine_day_id: "a", date: "2026-06-23", day_note: "", exercises_done: [] }];
    const result = mergeLogs(local, remote);
    expect(result[0].completed).toBe(true);
  });

  it("should prefer remote when updated_at is newer", () => {
    const local = [{ id: "1", updated_at: "2026-06-22T12:00:00Z", completed: false, routine_day_id: "a", date: "2026-06-23", day_note: "", exercises_done: [] }];
    const remote = [{ id: "1", updated_at: "2026-06-23T12:00:00Z", completed: true, routine_day_id: "a", date: "2026-06-23", day_note: "", exercises_done: [] }];
    const result = mergeLogs(local, remote);
    expect(result[0].completed).toBe(true);
  });

  it("should merge unique logs from both sides", () => {
    const local = [{ id: "1", updated_at: "2026-06-23T12:00:00Z", routine_day_id: "a", date: "2026-06-23", completed: false, day_note: "", exercises_done: [] }];
    const remote = [{ id: "2", updated_at: "2026-06-23T12:00:00Z", routine_day_id: "b", date: "2026-06-23", completed: false, day_note: "", exercises_done: [] }];
    const result = mergeLogs(local, remote);
    expect(result).toHaveLength(2);
  });
});

describe("calculateStats", () => {
  it("should calculate basic stats", () => {
    const logs = [
      {
        id: "1",
        routine_day_id: "a",
        date: "2026-06-23",
        completed: true,
        day_note: "",
        exercises_done: [
          { exercise_id: "e1", exercise_name: "Push-up", completed: true, actual_sets: null, actual_reps: null, actual_weight_kg: null, note: "" },
          { exercise_id: "e2", exercise_name: "Squat", completed: false, actual_sets: null, actual_reps: null, actual_weight_kg: null, note: "" },
        ],
      },
      {
        id: "2",
        routine_day_id: "b",
        date: "2026-06-24",
        completed: false,
        day_note: "",
        exercises_done: [
          { exercise_id: "e3", exercise_name: "Run", completed: true, actual_sets: null, actual_reps: null, actual_weight_kg: null, note: "" },
        ],
      },
    ];
    const stats = calculateStats(logs);
    expect(stats).toEqual({
      completed_days: 1,
      total_exercises_completed: 2,
      pending_sync: 0,
    });
  });

  it("should include pending sync count", () => {
    const logs = [
      {
        id: "1",
        routine_day_id: "a",
        date: "2026-06-23",
        completed: true,
        day_note: "",
        exercises_done: [],
      },
    ];
    const stats = calculateStats(logs, 3);
    expect(stats.pending_sync).toBe(3);
  });
});

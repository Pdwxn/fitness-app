import { describe, expect, it } from "vitest";

import { computeStreak } from "@/lib/streak";
import type { DailyLog } from "@/types/progress";
import type { Routine } from "@/types/routine";

// Mon/Wed/Fri are training days, the rest are rest days; week 1 starts Monday 2026-09-07.
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
        exercises: [],
      })),
    },
  ],
} as unknown as Routine;

const log = (date: string, completed = true) => ({ id: date, date, completed }) as unknown as DailyLog;

describe("computeStreak", () => {
  it("is 0 without a routine or without completed days", () => {
    expect(computeStreak([], null, new Date(2026, 8, 9))).toBe(0);
    expect(computeStreak([], routine, new Date(2026, 8, 9))).toBe(0);
  });

  it("counts completed training days and skips rest days", () => {
    const today = new Date(2026, 8, 11); // Friday
    expect(computeStreak([log("2026-09-07"), log("2026-09-09"), log("2026-09-11")], routine, today)).toBe(3);
  });

  it("does not break on a training day that is today and not done yet", () => {
    const today = new Date(2026, 8, 11);
    expect(computeStreak([log("2026-09-07"), log("2026-09-09")], routine, today)).toBe(2);
  });

  it("stops at a skipped training day", () => {
    const today = new Date(2026, 8, 11);
    expect(computeStreak([log("2026-09-07"), log("2026-09-11")], routine, today)).toBe(1);
  });

  it("ignores logs that were saved but not completed", () => {
    const today = new Date(2026, 8, 9);
    expect(computeStreak([log("2026-09-07"), log("2026-09-09", false)], routine, today)).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import { getNextTrainingDay, getScheduledDay, routineStartDate } from "@/lib/schedule";
import type { Routine, RoutineDay, RoutineWeek } from "@/types/routine";

function day(dayNumber: number, name: string, rest = false): RoutineDay {
  return { id: `d${dayNumber}`, day_number: dayNumber, day_name: name, is_rest_day: rest, exercises: [] } as unknown as RoutineDay;
}

/** Mon/Wed/Fri training, everything else rest (the classic AI shape: 7 days per week). */
function fullWeek(weekNumber: number): RoutineWeek {
  const names = ["Push", "Rest", "Pull", "Rest", "Legs", "Rest", "Rest"];
  return {
    id: `w${weekNumber}`,
    week_number: weekNumber,
    days: names.map((name, i) => ({
      ...day(i + 1, `${name} W${weekNumber}`, name === "Rest"),
      id: `w${weekNumber}d${i + 1}`,
    })),
  } as unknown as RoutineWeek;
}

function routine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: "r1",
    weeks: [fullWeek(1), fullWeek(2), fullWeek(3), fullWeek(4)],
    cycle_started_on: "2026-09-07", // a Monday
    generated_at: null,
    created_at: "2026-08-01T10:00:00Z",
    ...overrides,
  } as unknown as Routine;
}

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15, 30);
const label = (r: ReturnType<typeof getScheduledDay>) => r?.day?.day_name ?? "(undefined day)";

describe("getScheduledDay", () => {
  it.each([
    // [date, expected day name]
    [at(2026, 9, 7), "Push W1"], // start Monday = week 1 day 1
    [at(2026, 9, 8), "Rest W1"],
    [at(2026, 9, 9), "Pull W1"],
    [at(2026, 9, 11), "Legs W1"],
    [at(2026, 9, 13), "Rest W1"], // Sunday = day 7, still week 1
    [at(2026, 9, 14), "Push W2"], // next Monday = week 2
    [at(2026, 9, 28), "Push W4"],
    [at(2026, 10, 5), "Push W1"], // week 5 repeats from week 1
    [at(2026, 10, 14), "Pull W2"],
  ])("%s -> %s", (date, expected) => {
    expect(label(getScheduledDay(routine(), date))).toBe(expected);
  });

  it("flags rest days", () => {
    expect(getScheduledDay(routine(), at(2026, 9, 8))?.isRestDay).toBe(true);
    expect(getScheduledDay(routine(), at(2026, 9, 7))?.isRestDay).toBe(false);
  });

  it("week 1 is the calendar week of the start date, even when started mid-week", () => {
    const thursdayStart = routine({ cycle_started_on: "2026-09-10" }); // Thursday
    expect(label(getScheduledDay(thursdayStart, at(2026, 9, 10)))).toBe("Rest W1"); // Thu = day 4
    expect(label(getScheduledDay(thursdayStart, at(2026, 9, 11)))).toBe("Legs W1"); // Fri
    expect(label(getScheduledDay(thursdayStart, at(2026, 9, 14)))).toBe("Push W2"); // next Monday
  });

  it("a weekday the routine does not define is a rest day (3-day split with days 1/3/5 only)", () => {
    const sparse = {
      id: "w1",
      week_number: 1,
      days: [day(1, "A"), day(3, "B"), day(5, "C")],
    } as unknown as RoutineWeek;
    const r = routine({ weeks: [sparse] });

    const tuesday = getScheduledDay(r, at(2026, 9, 8));
    expect(tuesday).toMatchObject({ day: null, isRestDay: true });
    expect(label(getScheduledDay(r, at(2026, 9, 9)))).toBe("B");
    expect(getScheduledDay(r, at(2026, 9, 15))?.week.week_number).toBe(1); // single week repeats
  });

  it("ignores the order weeks arrive in", () => {
    const shuffled = routine({ weeks: [fullWeek(3), fullWeek(1), fullWeek(2)] });
    expect(label(getScheduledDay(shuffled, at(2026, 9, 14)))).toBe("Push W2");
  });

  it("dates before the start clamp to week 1", () => {
    expect(getScheduledDay(routine(), at(2026, 8, 1))?.week.week_number).toBe(1);
  });

  it("is stable across DST changes (EU Oct 25 and US Mar 8/Nov 1 all fall in a Sunday->Monday span)", () => {
    const r = routine({ cycle_started_on: "2026-10-19" }); // Monday before EU DST end
    expect(label(getScheduledDay(r, at(2026, 10, 25)))).toBe("Rest W1"); // the DST Sunday
    expect(label(getScheduledDay(r, at(2026, 10, 26)))).toBe("Push W2");
    const us = routine({ cycle_started_on: "2026-03-02" });
    expect(label(getScheduledDay(us, at(2026, 3, 8)))).toBe("Rest W1"); // US spring forward
    expect(label(getScheduledDay(us, at(2026, 3, 9)))).toBe("Push W2");
  });

  it("does not depend on the time of day", () => {
    const r = routine();
    expect(label(getScheduledDay(r, new Date(2026, 8, 9, 0, 0, 1)))).toBe("Pull W1");
    expect(label(getScheduledDay(r, new Date(2026, 8, 9, 23, 59, 59)))).toBe("Pull W1");
  });

  it("returns null when there is nothing to schedule", () => {
    expect(getScheduledDay(routine({ weeks: [] }), at(2026, 9, 7))).toBeNull();
    expect(getScheduledDay(routine({ cycle_started_on: null, generated_at: null, created_at: "" }), at(2026, 9, 7))).toBeNull();
  });
});

describe("routineStartDate", () => {
  it("prefers the cycle start, then generation, then creation", () => {
    expect(routineStartDate(routine())).toEqual(new Date(2026, 8, 7));
    expect(
      routineStartDate(routine({ cycle_started_on: null, generated_at: "2026-09-02T12:00:00" })),
    ).toEqual(new Date(2026, 8, 2));
    expect(routineStartDate(routine({ cycle_started_on: undefined, generated_at: null, created_at: "2026-08-01T12:00:00" }))).toEqual(
      new Date(2026, 7, 1),
    );
  });

  it("reads a date-only value as a local date, not UTC", () => {
    const start = routineStartDate(routine({ cycle_started_on: "2026-09-01" }))!;
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 8, 1]);
  });
});

describe("getNextTrainingDay", () => {
  it("returns today when today is a training day", () => {
    const next = getNextTrainingDay(routine(), at(2026, 9, 9));
    expect(next).toMatchObject({ daysAhead: 0 });
    expect(next?.day.day_name).toBe("Pull W1");
  });

  it("skips rest days", () => {
    const next = getNextTrainingDay(routine(), at(2026, 9, 8)); // Tuesday (rest)
    expect(next?.daysAhead).toBe(1);
    expect(next?.day.day_name).toBe("Pull W1");
  });

  it("can exclude today", () => {
    const next = getNextTrainingDay(routine(), at(2026, 9, 9), { includeToday: false });
    expect(next?.daysAhead).toBe(2);
    expect(next?.day.day_name).toBe("Legs W1");
  });

  it("crosses into the next routine week", () => {
    const next = getNextTrainingDay(routine(), at(2026, 9, 12)); // Saturday
    expect(next?.daysAhead).toBe(2);
    expect(next?.day.day_name).toBe("Push W2");
    expect(next?.date).toEqual(new Date(2026, 8, 14));
  });

  it("wraps past the last week", () => {
    const next = getNextTrainingDay(routine(), at(2026, 10, 3)); // Saturday of week 4
    expect(next?.day.day_name).toBe("Push W1");
  });

  it("is null for a routine with no training day", () => {
    const allRest = routine({
      weeks: [{ id: "w1", week_number: 1, days: [day(1, "Rest", true)] } as unknown as RoutineWeek],
    });
    expect(getNextTrainingDay(allRest, at(2026, 9, 7))).toBeNull();
  });
});

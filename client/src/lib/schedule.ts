import type { Routine, RoutineDay, RoutineWeek } from "@/types/routine";

/**
 * Which day of the routine falls on a given calendar date.
 *
 * Rules (agreed in the plan):
 * - `day_number` 1-7 is the weekday, Monday = 1 ... Sunday = 7.
 * - Week 1 is the calendar week (Monday-Sunday) containing the routine's
 *   start date; each following calendar week is the next routine week, and the
 *   routine repeats from week 1 once it runs out.
 * - A weekday the routine doesn't define (e.g. a 3-day split that only has
 *   days 1, 3, 5) is a rest day.
 *
 * Everything works on whole calendar days in the viewer's local timezone;
 * day arithmetic goes through UTC day numbers so DST changes can't shift it.
 */

export type ScheduledDay = {
  week: RoutineWeek;
  /** `null` when the routine doesn't define this weekday (treated as rest). */
  day: RoutineDay | null;
  isRestDay: boolean;
};

export type UpcomingTrainingDay = {
  date: Date;
  daysAhead: number;
  week: RoutineWeek;
  day: RoutineDay;
};

const MS_PER_DAY = 86_400_000;

/** Whole days since the epoch for the local calendar date of `date`. */
function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

/** Monday = 1 ... Sunday = 7. */
function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

// A known Monday, used only to turn a day_number (1-7) into a weekday name --
// never compared against real dates.
const REFERENCE_MONDAY = new Date(2024, 0, 1);

/** The weekday name for a `day_number` (1-7, Monday-Sunday), independent of any real date. */
export function weekdayNameForDayNumber(dayNumber: number, locale: string): string {
  const date = addDays(REFERENCE_MONDAY, dayNumber - 1);
  const name = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function mondayNumber(date: Date): number {
  return dayNumber(date) - (isoWeekday(date) - 1);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** `"2026-09-01"` -> local Sep 1 (not UTC, which could land on the previous day). */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** When this run of the routine began: the cycle start, else generation, else creation. */
export function routineStartDate(routine: Routine): Date | null {
  if (routine.cycle_started_on) {
    const parsed = parseDateOnly(routine.cycle_started_on);
    if (parsed) return parsed;
  }
  for (const value of [routine.generated_at, routine.created_at]) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return startOfLocalDay(parsed);
  }
  return null;
}

function orderedWeeks(routine: Routine): RoutineWeek[] {
  return [...routine.weeks].sort((a, b) => a.week_number - b.week_number);
}

export function getScheduledDay(routine: Routine, date: Date): ScheduledDay | null {
  const weeks = orderedWeeks(routine);
  const start = routineStartDate(routine);
  if (weeks.length === 0 || !start) return null;

  const weeksElapsed = Math.max(0, Math.floor((mondayNumber(date) - mondayNumber(start)) / 7));
  const week = weeks[weeksElapsed % weeks.length];
  const weekday = isoWeekday(date);
  const day = week.days.find((candidate) => candidate.day_number === weekday) ?? null;

  return { week, day, isRestDay: day === null || day.is_rest_day };
}

/**
 * The next training day, looking ahead from `from` (today counts unless
 * `includeToday` is false). `null` if the routine has no training day at all.
 */
export function getNextTrainingDay(
  routine: Routine,
  from: Date,
  options: { includeToday?: boolean } = {},
): UpcomingTrainingDay | null {
  const weeks = orderedWeeks(routine);
  const first = options.includeToday === false ? 1 : 0;

  for (let offset = first; offset <= 7 * weeks.length; offset += 1) {
    const date = addDays(from, offset);
    const scheduled = getScheduledDay(routine, date);
    if (scheduled && !scheduled.isRestDay && scheduled.day) {
      return { date, daysAhead: offset, week: scheduled.week, day: scheduled.day };
    }
  }
  return null;
}

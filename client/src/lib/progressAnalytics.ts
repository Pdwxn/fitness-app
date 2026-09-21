import { getScheduledDay } from "@/lib/schedule";
import type { DailyLog, ExerciseLog } from "@/types/progress";
import type { Routine } from "@/types/routine";

export type ProgressPeriod = "week" | "month";

export type DayPoint = { date: string; value: number };

export type ProgressAnalysis = {
  range: { start: string; end: string };
  volume: { total: number; previous: number; deltaPercent: number | null; daily: DayPoint[] };
  workouts: {
    completed: number;
    planned: number;
    days: { date: string; planned: boolean; done: boolean; isFuture: boolean }[];
  };
  /** Completed share of the planned training days that have already come up; `null` if none have. */
  consistency: number | null;
  muscles: { muscle: string; sets: number; delta: number }[];
};

export type StrengthOption = { key: string; name: string; count: number };

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The period containing `now` and the one right before it. Weeks run Monday-Sunday. */
export function periodRanges(period: ProgressPeriod, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "week") {
    const start = addDays(today, -((today.getDay() + 6) % 7));
    const end = addDays(start, 6);
    return { start, end, previousStart: addDays(start, -7), previousEnd: addDays(start, -1) };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    start,
    end,
    previousStart: new Date(today.getFullYear(), today.getMonth() - 1, 1),
    previousEnd: new Date(today.getFullYear(), today.getMonth(), 0),
  };
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(value: string | null | undefined): number | null {
  const match = /\d+([.,]\d+)?/.exec(value ?? "");
  return match ? toNumber(match[0]) : null;
}

/** Kilograms moved in one exercise: reps x weight over its completed sets. */
export function exerciseVolume(entry: ExerciseLog): number {
  if (entry.sets) {
    return entry.sets.reduce((sum, set) => {
      const reps = firstNumber(set.reps);
      const weight = toNumber(set.weight_kg);
      return set.completed && reps && weight ? sum + reps * weight : sum;
    }, 0);
  }

  // Logs saved before per-set logging only have totals: "10,10,9" reps at one weight.
  const weight = toNumber(entry.actual_weight_kg);
  if (!weight || !entry.actual_reps) return 0;
  const reps = entry.actual_reps.split(",").reduce((sum, part) => sum + (firstNumber(part) ?? 0), 0);
  return reps * weight;
}

function completedSets(entry: ExerciseLog): number {
  if (entry.sets) return entry.sets.filter((set) => set.completed).length;
  return entry.actual_sets ?? 0;
}

function logVolume(log: DailyLog): number {
  return log.exercises_done.reduce((sum, entry) => sum + exerciseVolume(entry), 0);
}

function inRange(date: string, start: Date, end: Date): boolean {
  return date >= formatDate(start) && date <= formatDate(end);
}

function muscleLookup(routine: Routine | null): Map<string, string> {
  const byExercise = new Map<string, string>();
  for (const week of routine?.weeks ?? []) {
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        if (exercise.muscle_group) byExercise.set(exercise.id, exercise.muscle_group);
      }
    }
  }
  return byExercise;
}

function muscleSets(logs: DailyLog[], lookup: Map<string, string>, start: Date, end: Date): Map<string, number> {
  const totals = new Map<string, number>();
  for (const log of logs) {
    if (!inRange(log.date, start, end)) continue;
    for (const entry of log.exercises_done) {
      const muscle = lookup.get(entry.exercise_id);
      const sets = completedSets(entry);
      if (muscle && sets > 0) totals.set(muscle, (totals.get(muscle) ?? 0) + sets);
    }
  }
  return totals;
}

function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

export function analyzeProgress(
  logs: DailyLog[],
  routine: Routine | null,
  period: ProgressPeriod,
  now: Date = new Date(),
): ProgressAnalysis {
  const { start, end, previousStart, previousEnd } = periodRanges(period, now);
  const todayKey = formatDate(now);
  const inPeriod = logs.filter((log) => inRange(log.date, start, end));
  const volumeByDate = new Map<string, number>();
  for (const log of inPeriod) volumeByDate.set(log.date, (volumeByDate.get(log.date) ?? 0) + logVolume(log));

  const total = [...volumeByDate.values()].reduce((sum, value) => sum + value, 0);
  const previous = logs
    .filter((log) => inRange(log.date, previousStart, previousEnd))
    .reduce((sum, log) => sum + logVolume(log), 0);

  const completedDates = new Set(inPeriod.filter((log) => log.completed).map((log) => log.date));
  const days = eachDay(start, end).map((date) => {
    const key = formatDate(date);
    const scheduled = routine ? getScheduledDay(routine, date) : null;
    return {
      date: key,
      planned: Boolean(scheduled && !scheduled.isRestDay),
      done: completedDates.has(key),
      isFuture: key > todayKey,
    };
  });
  const plannedSoFar = days.filter((day) => day.planned && !day.isFuture);
  const doneSoFar = plannedSoFar.filter((day) => day.done).length;

  const lookup = muscleLookup(routine);
  const current = muscleSets(logs, lookup, start, end);
  const before = muscleSets(logs, lookup, previousStart, previousEnd);
  const muscles = [...current.entries()]
    .map(([muscle, sets]) => ({ muscle, sets, delta: sets - (before.get(muscle) ?? 0) }))
    .sort((a, b) => b.sets - a.sets);

  return {
    range: { start: formatDate(start), end: formatDate(end) },
    volume: {
      total: Math.round(total),
      previous: Math.round(previous),
      deltaPercent: percentChange(total, previous),
      daily: eachDay(start, end).map((date) => ({ date: formatDate(date), value: Math.round(volumeByDate.get(formatDate(date)) ?? 0) })),
    },
    workouts: { completed: completedDates.size, planned: days.filter((day) => day.planned).length, days },
    consistency: plannedSoFar.length ? Math.round((doneSoFar / plannedSoFar.length) * 100) : null,
    muscles,
  };
}

function strengthKey(entry: ExerciseLog): string {
  return entry.source_external_id || entry.exercise_name;
}

function bestWeight(entry: ExerciseLog): number | null {
  const weights = (entry.sets ?? [])
    .filter((set) => set.completed)
    .map((set) => toNumber(set.weight_kg))
    .filter((weight): weight is number => weight !== null && weight > 0);
  if (weights.length) return Math.max(...weights);
  const legacy = entry.sets ? null : toNumber(entry.actual_weight_kg);
  return legacy && legacy > 0 && entry.completed ? legacy : null;
}

/** Exercises that have been logged with a weight, most logged first. */
export function strengthOptions(logs: DailyLog[]): StrengthOption[] {
  const options = new Map<string, StrengthOption>();
  for (const log of logs) {
    for (const entry of log.exercises_done) {
      if (bestWeight(entry) === null) continue;
      const key = strengthKey(entry);
      const existing = options.get(key);
      options.set(key, { key, name: entry.exercise_name, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...options.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Heaviest completed set of one exercise on each date it was logged, oldest first. */
export function strengthSeries(logs: DailyLog[], key: string): DayPoint[] {
  const byDate = new Map<string, number>();
  for (const log of logs) {
    for (const entry of log.exercises_done) {
      if (strengthKey(entry) !== key) continue;
      const weight = bestWeight(entry);
      if (weight !== null) byDate.set(log.date, Math.max(byDate.get(log.date) ?? 0, weight));
    }
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

import { getScheduledDay } from "@/lib/schedule";
import type { DailyLog } from "@/types/progress";
import type { Routine } from "@/types/routine";

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MAX_LOOKBACK_DAYS = 400;

/**
 * Consecutive scheduled training days completed, counting back from today.
 * Rest days neither add to nor break the streak; a training day that was
 * skipped ends it, except today's, which can still be done.
 */
export function computeStreak(logs: DailyLog[], routine: Routine | null, today: Date = new Date()): number {
  if (!routine) return 0;

  const completedDates = new Set(logs.filter((log) => log.completed).map((log) => log.date));
  let streak = 0;

  for (let offset = 0; offset < MAX_LOOKBACK_DAYS; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const scheduled = getScheduledDay(routine, date);
    if (!scheduled) break;
    if (scheduled.isRestDay) continue;

    if (completedDates.has(formatDate(date))) {
      streak += 1;
    } else if (offset > 0) {
      break;
    }
  }

  return streak;
}

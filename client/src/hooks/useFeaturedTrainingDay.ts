"use client";

import { useLocale, useTranslations } from "next-intl";

import { getNextTrainingDay, getScheduledDay } from "@/lib/schedule";
import type { Routine, RoutineDay } from "@/types/routine";

function getFirstTrainingDay(routine: Routine): RoutineDay | null {
  for (const week of routine.weeks) {
    const day = week.days.find((routineDay) => !routineDay.is_rest_day);
    if (day) return day;
  }
  return null;
}

function weekdayName(date: Date, locale: string): string {
  const name = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export type FeaturedTrainingDay = {
  /** Today's day if it's a training day, else the next one; falls back to the routine's first training day. */
  day: RoutineDay | null;
  /** True only when today is a rest day AND there is a future training day to show instead. */
  restToday: boolean;
  /** "Hoy" / "Mañana" / the weekday name, or null when there's no usable schedule (no start date). */
  when: string | null;
};

/** Single source of truth for "what training day does the dashboard feature right now" -- shared by the hero card and the exercise preview list so they never disagree. */
export function useFeaturedTrainingDay(routine: Routine): FeaturedTrainingDay {
  const t = useTranslations("Dashboard.activeRoutine");
  const locale = useLocale();

  const now = new Date();
  const scheduledToday = getScheduledDay(routine, now);
  const upcoming = getNextTrainingDay(routine, now);
  const day = upcoming?.day ?? getFirstTrainingDay(routine);
  const restToday = Boolean(scheduledToday?.isRestDay && upcoming);
  const when = upcoming
    ? upcoming.daysAhead === 0
      ? t("today")
      : upcoming.daysAhead === 1
        ? t("tomorrow")
        : weekdayName(upcoming.date, locale)
    : null;

  return { day, restToday, when };
}

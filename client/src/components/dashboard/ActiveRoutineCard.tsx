"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { getNextTrainingDay, getScheduledDay } from "@/lib/schedule";
import type { Routine } from "@/types/routine";

type ActiveRoutineCardProps = {
  routine: Routine;
  href: string;
  /** Deep link to a specific day; when given, "start workout" opens the featured day. */
  dayHref?: (dayId: string) => string;
  labels: {
    eyebrow: string;
    upNext: string;
    startWorkout: string;
    exercises: string;
    title: string;
    description: string;
    cta: string;
    weeks: string;
    activeDays: string;
    nextWorkout: string;
    restDay: string;
  };
};

function countActiveDays(routine: Routine) {
  return routine.weeks.reduce(
    (total, week) => total + week.days.filter((day) => !day.is_rest_day).length,
    0,
  );
}

function getFirstTrainingDay(routine: Routine) {
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

export function ActiveRoutineCard({ routine, href, dayHref, labels }: ActiveRoutineCardProps) {
  const t = useTranslations("Dashboard.activeRoutine");
  const locale = useLocale();

  // Calendar-based: today's routine day if it's a training day, otherwise the
  // next one. Falls back to the first training day if the routine has no
  // usable start date.
  const now = new Date();
  const scheduledToday = getScheduledDay(routine, now);
  const upcoming = getNextTrainingDay(routine, now);
  const trainingDay = upcoming?.day ?? getFirstTrainingDay(routine);
  const restToday = Boolean(scheduledToday?.isRestDay && upcoming);
  const when = upcoming
    ? upcoming.daysAhead === 0
      ? t("today")
      : upcoming.daysAhead === 1
        ? t("tomorrow")
        : weekdayName(upcoming.date, locale)
    : null;

  const activeDays = countActiveDays(routine);
  const estimateMinutes = trainingDay ? Math.max(30, trainingDay.exercises.length * 12) : 30;
  const startHref = trainingDay && dayHref ? dayHref(trainingDay.id) : href;

  return (
    <section className="apex-card relative overflow-hidden rounded-[2rem] text-white">
      <div className="pointer-events-none absolute -right-10 -top-12 size-52 rounded-full bg-[#a6ff00]/20 blur-3xl" />
      <div className="relative p-6 md:p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">
          {labels.upNext}
          {when ? ` · ${when}` : ""}
        </p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm text-white/55">{labels.eyebrow}</p>
            {restToday ? (
              <p className="mt-2 text-sm font-bold text-[#d7ff8a]">{t("restToday")}</p>
            ) : null}
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              {trainingDay?.day_name ?? labels.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-white/65">
              ~ {estimateMinutes} min · {trainingDay?.exercises.length ?? 0} {labels.exercises}
            </p>
          </div>
          <Link href={startHref} className="apex-button w-fit rounded-2xl px-5 py-3 text-sm font-black">
            {labels.startWorkout}
          </Link>
        </div>
      </div>
      <div className="relative grid grid-cols-3 border-t border-white/10 text-center text-sm font-bold text-white/65">
        <div className="p-4">
          <span className="block text-2xl text-white">{routine.weeks.length}</span>
          {labels.weeks}
        </div>
        <div className="border-x border-white/10 p-4">
          <span className="block text-2xl text-white">{activeDays}</span>
          {labels.activeDays}
        </div>
        <div className="p-4">
          <span className="block truncate text-2xl text-white">
            {when ?? labels.restDay}
          </span>
          {labels.nextWorkout}
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Clock } from "lucide-react";

import { StatusCard } from "@/components/ui/StatusCard";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import { weekdayNameForDayNumber } from "@/lib/schedule";

import { DailyLogForm } from "./DailyLogForm";
import { RestDayLogForm } from "./RestDayLogForm";

const MAX_FOCUS_MUSCLES = 3;

function focusSummary(muscleGroups: string[]): string {
  const unique = [...new Set(muscleGroups.filter(Boolean))];
  return unique.slice(0, MAX_FOCUS_MUSCLES).join(", ");
}

type RoutineDayPageContentProps = {
  dayId: string;
  locale: string;
  labels: {
    loading: string;
    error: string;
    notFound: string;
  };
};

export function RoutineDayPageContent({ dayId, locale, labels }: RoutineDayPageContentProps) {
  const t = useTranslations("RoutineDay");
  const { routine, isLoading, hasError } = useRoutineCache();

  const week = routine?.weeks.find((w) => w.days.some((d) => d.id === dayId)) ?? null;
  const day = week?.days.find((item) => item.id === dayId) ?? null;

  if (isLoading) return <StatusCard message={labels.loading} />;
  if (hasError && !routine) return <StatusCard message={labels.error} tone="error" />;
  if (!day || !week) return <StatusCard message={labels.notFound} />;

  const estimateMinutes = Math.max(30, day.exercises.length * 12);
  const focus = focusSummary(day.exercises.map((exercise) => exercise.muscle_group));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${locale}/routine`}
        className="flex h-12 w-fit items-center gap-1.5 rounded-full border border-white/[0.22] px-4 text-base font-semibold"
      >
        <ArrowLeft aria-hidden="true" size={22} strokeWidth={1.6} />
        {t("back")}
      </Link>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-14">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#a6ff00]">
            {t("weekAndDay", { week: week.week_number, weekday: weekdayNameForDayNumber(day.day_number, locale) })}
          </p>
          <h1 className="text-[44px] font-black leading-none tracking-tight md:text-6xl">{day.day_name}</h1>
          <p className="flex items-center gap-2 text-lg font-medium text-white/60">
            <Clock aria-hidden="true" size={20} strokeWidth={1.5} />
            <span>{t("durationAndCount", { minutes: estimateMinutes, count: day.exercises.length })}</span>
          </p>
          {!day.is_rest_day && focus ? (
            <span className="w-fit rounded-full border border-[#a6ff00]/55 bg-[#a6ff00]/10 px-4 py-2 text-sm font-bold text-[#a6ff00]">
              {t("focus", { muscles: focus })}
            </span>
          ) : null}
        </div>
      </div>

      {day.is_rest_day ? <RestDayLogForm day={day} /> : <DailyLogForm day={day} />}
    </div>
  );
}

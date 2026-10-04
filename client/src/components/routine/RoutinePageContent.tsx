"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Calendar, Check, ChevronRight, ClipboardList, Pencil } from "lucide-react";

import { StatusCard } from "@/components/ui/StatusCard";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { usePendingRoutine } from "@/hooks/usePendingRoutine";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import { precacheRoutineMedia } from "@/lib/mediaCache";
import { calendarDateForRoutineDay, getScheduledDay } from "@/lib/schedule";
import { routinePeriodLabel } from "@/types/routine";
import type { Routine } from "@/types/routine";

import { ChangeRoutineButton } from "./ChangeRoutineButton";
import { RoutineChoiceScreen } from "./RoutineChoiceScreen";

type RoutinePageContentProps = {
  locale: string;
};

const WEEK_STORAGE_KEY = "apex:routine-week";

/**
 * The week the user last picked for this routine. Kept in sessionStorage so it
 * survives opening a day and coming back (the page remounts), and a reload.
 */
function readRememberedWeekId(routineId: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(WEEK_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as { routineId?: string; weekId?: string }) : null;
    return stored?.routineId === routineId ? (stored.weekId ?? null) : null;
  } catch {
    return null;
  }
}

function rememberWeekId(routineId: string, weekId: string) {
  try {
    window.sessionStorage.setItem(WEEK_STORAGE_KEY, JSON.stringify({ routineId, weekId }));
  } catch {
    /* private mode / storage disabled: the week just won't be remembered */
  }
}

/** The week containing today, or the first week if the routine has no usable start date. */
function currentWeekIndex(routine: Routine): number {
  const scheduled = getScheduledDay(routine, new Date());
  if (!scheduled) return 0;
  const index = routine.weeks.findIndex((week) => week.id === scheduled.week.id);
  return index >= 0 ? index : 0;
}

export function RoutinePageContent({ locale }: RoutinePageContentProps) {
  const t = useTranslations("Routine");
  const { routine, isLoading, hasError, isOfflineFallback } = useRoutineCache();

  // Photos and demos are only needed once the routine is on screen. Fetch them
  // after a short pause so they never compete with this page's own data.
  useEffect(() => {
    if (!routine) return;
    const timer = window.setTimeout(() => void precacheRoutineMedia(routine).catch(() => undefined), 1500);
    return () => window.clearTimeout(timer);
  }, [routine]);
  const { hasPending, isLoading: pendingLoading } = usePendingRoutine();
  const { logs } = useDailyLogs();
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  if (isLoading || pendingLoading) {
    return <StatusCard message={t("states.loading")} />;
  }

  if (hasError && !routine) {
    return <StatusCard message={t("states.error")} tone="error" />;
  }

  if (!routine) {
    return <RoutineChoiceScreen locale={locale} hasPending={hasPending} />;
  }

  const rememberedIndex = routine.weeks.findIndex(
    (w) => w.id === (selectedWeekId ?? readRememberedWeekId(routine.id)),
  );
  const weekIndex = rememberedIndex >= 0 ? rememberedIndex : currentWeekIndex(routine);
  const week = routine.weeks[weekIndex] ?? routine.weeks[0];
  const orderedDays = [...(week?.days ?? [])].sort((a, b) => a.day_number - b.day_number);
  const todayDayId = getScheduledDay(routine, new Date())?.day?.id ?? null;
  const isManual = routine.source === "manual";

  return (
    <div className="flex flex-col gap-6">
      {isOfflineFallback ? <StatusCard message={t("states.offlineFallback")} tone="warning" /> : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#a6ff00]">{t("eyebrow")}</p>
          <h1 className="text-[42px] font-black leading-none tracking-tight md:text-6xl">{t("activeTitle")}</h1>
          <span className="flex w-fit items-center gap-2 rounded-full border border-[#a6ff00]/55 bg-[#a6ff00]/10 px-4 py-2 text-sm font-bold text-[#a6ff00]">
            {isManual ? (
              <ClipboardList aria-hidden="true" size={18} strokeWidth={1.6} />
            ) : (
              <Calendar aria-hidden="true" size={18} strokeWidth={1.6} />
            )}
            <span>{isManual ? t("manualBadge") : t("monthlyBadge", { period: routinePeriodLabel(routine) ?? "" })}</span>
          </span>
        </div>

        <div className="flex flex-row gap-2.5">
          {isManual ? (
            <Link
              href={`/${locale}/routine/builder?mode=edit`}
              className="apex-button-outline flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl px-3 text-[15px] font-bold sm:flex-none sm:px-5 sm:text-base"
            >
              <Pencil aria-hidden="true" size={20} strokeWidth={1.6} />
              {t("editRoutine")}
            </Link>
          ) : null}
          <ChangeRoutineButton routineId={routine.id} />
        </div>
      </div>

      {routine.weeks.length > 1 ? (
        <div role="group" aria-label={t("week")} className="grid grid-cols-4 gap-2">
          {routine.weeks.map((w, index) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={index === weekIndex}
              onClick={() => {
                setSelectedWeekId(w.id);
                rememberWeekId(routine.id, w.id);
              }}
              className={`flex h-[52px] items-center justify-center rounded-[26px] px-1 text-[15px] font-bold ${
                index === weekIndex ? "bg-[#a6ff00] text-black" : "border border-white/[0.22] text-white"
              }`}
            >
              {t("week")} {w.week_number}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2.5 md:grid-cols-2">
        {orderedDays.map((day) => {
          const isToday = day.id === todayDayId;
          const date = week ? calendarDateForRoutineDay(routine, week, day) : null;
          const isCompleted = Boolean(
            date &&
              logs.some(
                (log) =>
                  (log.routine_day_id === day.id || log.routine_day === day.id) &&
                  log.date === date &&
                  log.completed,
              ),
          );

          return (
            <Link
              key={day.id}
              href={`/${locale}/routine/${day.id}`}
              aria-label={`${day.day_name}${isToday ? ` · ${t("today")}` : ""}`}
              className={`flex items-center gap-3.5 py-3 ${
                isToday
                  ? "rounded-[26px] border border-[#a6ff00]/55 bg-white/[0.065] px-4"
                  : "border-t border-white/[0.13]"
              }`}
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-full text-lg font-extrabold ${
                  isToday ? "bg-[#a6ff00] text-black" : "border border-white/30 text-white"
                }`}
              >
                {day.day_number}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-xl font-extrabold leading-tight ${day.is_rest_day ? "text-white/60" : ""}`}>
                  {day.day_name}
                </span>
                {!day.is_rest_day ? (
                  <span className="mt-0.5 block text-[15px] font-medium text-white/60">
                    {day.exercises.length} {t("exercises")}
                  </span>
                ) : null}
              </span>
              {isCompleted ? (
                <span
                  role="img"
                  aria-label={t("completedAria")}
                  className="grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00] text-[#a6ff00]"
                >
                  <Check aria-hidden="true" size={20} strokeWidth={2.4} />
                </span>
              ) : null}
              {isToday ? (
                <span className="shrink-0 rounded-2xl bg-[#a6ff00] px-3 py-1.5 text-[13px] font-black tracking-[0.12em] text-black">
                  {t("today")}
                </span>
              ) : null}
              <ChevronRight aria-hidden="true" size={22} className="shrink-0 text-white/60" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { StatusCard } from "@/components/ui/StatusCard";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProgressStats } from "@/hooks/useProgressStats";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import {
  analyzeProgress,
  strengthOptions,
  strengthSeries,
  type ProgressPeriod,
} from "@/lib/progressAnalytics";

import { DailyBars, Donut, LineChart } from "./ProgressCharts";

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-white/[0.13] pt-6">
      <div>
        <h2 className="text-2xl font-black leading-tight tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-medium text-white/60">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProgressContent({ locale }: { locale: string }) {
  const t = useTranslations("Progress");
  const intlLocale = useLocale();
  const [period, setPeriod] = useState<ProgressPeriod>("week");
  const [chosenExercise, setChosenExercise] = useState<string | null>(null);
  const { isLoading: statsLoading, hasError: statsError, isOfflineFallback: statsOffline, stats } = useProgressStats();
  const { logs, isLoading: logsLoading, hasError: logsError, isOfflineFallback: logsOffline } = useDailyLogs();
  const { routine } = useRoutineCache();

  const now = useMemo(() => new Date(), []);
  const analysis = useMemo(() => analyzeProgress(logs, routine, period, now), [logs, routine, period, now]);
  const options = useMemo(() => strengthOptions(logs), [logs]);
  const exerciseKey = options.some((option) => option.key === chosenExercise) ? chosenExercise : (options[0]?.key ?? null);
  const series = useMemo(() => (exerciseKey ? strengthSeries(logs, exerciseKey) : []), [logs, exerciseKey]);
  const exerciseName = options.find((option) => option.key === exerciseKey)?.name ?? "";
  const dayNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const week of routine?.weeks ?? []) for (const day of week.days) names.set(day.id, day.day_name);
    return names;
  }, [routine]);
  const recentLogs = useMemo(() => [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [logs]);

  const number = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 });
  const shortDate = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short" }).format(new Date(year, month - 1, day));
  };
  const longDate = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short", day: "numeric", month: "short" }).format(
      new Date(year, month - 1, day),
    );
  };

  const isLoading = statsLoading || logsLoading;
  const hasError = (statsError || logsError) && !stats && !logs.length;
  const isOffline = statsOffline || logsOffline;

  if (isLoading) return <StatusCard message={t("states.loading")} />;
  if (hasError) return <StatusCard message={t("states.error")} tone="error" />;

  const vs = period === "week" ? t("vsWeek") : t("vsMonth");
  const { volume, workouts, consistency, muscles } = analysis;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const topMuscle = Math.max(...muscles.map((muscle) => muscle.sets), 1);
  const first = series[0];
  const last = series[series.length - 1];
  const gain = first && last ? last.value - first.value : 0;

  return (
    <div className="flex flex-col gap-7 text-white">
      <div className="flex flex-col gap-4">
        <h1 className="text-[42px] font-black leading-none tracking-tight md:text-5xl">{t("title")}</h1>
        <div role="group" aria-label={t("periodLabel")} className="grid max-w-md grid-cols-2 gap-2">
          {(["week", "month"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              className={`flex h-12 items-center justify-center rounded-3xl text-base font-bold ${
                period === option ? "border border-[#a6ff00] bg-[#a6ff00] font-extrabold text-black" : "border border-white/[0.22]"
              }`}
            >
              {t(option === "week" ? "thisWeek" : "thisMonth")}
            </button>
          ))}
        </div>
      </div>

      {isOffline ? (
        <p role="status" className="flex items-center gap-3 rounded-3xl border border-white/[0.22] bg-white/5 px-[18px] py-4 text-[15px] font-semibold">
          <Info aria-hidden="true" size={22} strokeWidth={1.6} className="shrink-0 text-[#a6ff00]" />
          {t("states.offline")}
        </p>
      ) : null}

      <div className="grid gap-7 md:grid-cols-2 md:gap-x-12">
        <Card title={t("volume.title")}>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black leading-none">{number.format(volume.total)}</span>
            <span className="text-lg font-bold text-white/60">{t("volume.unit")}</span>
          </div>
          <p className="text-[15px] font-semibold text-white/60">
            {volume.deltaPercent === null ? (
              t("volume.noPrevious")
            ) : (
              <>
                <span className="font-extrabold text-white">
                  {volume.deltaPercent > 0 ? "+" : ""}
                  {volume.deltaPercent}%
                </span>{" "}
                {vs}
              </>
            )}
          </p>
          <DailyBars
            points={volume.daily}
            highlightDate={todayKey}
            ariaLabel={t("volume.chartAria")}
            format={(value) => `${number.format(value)} ${t("volume.unit")}`}
            labelFor={(point, index) =>
              period === "week"
                ? new Intl.DateTimeFormat(intlLocale, { weekday: "narrow" }).format(new Date(`${point.date}T12:00:00`))
                : index % 7 === 0
                  ? String(Number(point.date.slice(8)))
                  : null
            }
          />
        </Card>

        <div className="flex flex-col gap-7">
          <Card title={t("workouts.title")}>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none">{workouts.completed}</span>
              <span className="text-lg font-bold text-white/60">{t("workouts.ofDays", { planned: workouts.planned })}</span>
            </div>
            <ol
              aria-label={t("workouts.daysAria", { done: workouts.completed, planned: workouts.planned })}
              className="flex flex-wrap gap-1.5"
            >
              {workouts.days.map((day) => (
                <li
                  key={day.date}
                  title={longDate(day.date)}
                  className={`size-3.5 rounded-full ${
                    day.done
                      ? "bg-[#a6ff00]"
                      : day.planned
                        ? day.isFuture
                          ? "border-[1.5px] border-white/30"
                          : "border-[1.5px] border-white/60"
                        : "bg-white/10"
                  }`}
                />
              ))}
            </ol>
          </Card>

          <Card title={t("consistency.title")}>
            <Donut
              percent={consistency}
              ariaLabel={consistency === null ? t("consistency.none") : t("consistency.aria", { percent: consistency })}
            />
          </Card>
        </div>

        <Card title={t("muscles.title")} subtitle={t("muscles.subtitle", { vs })}>
          {muscles.length ? (
            <ul className="flex flex-col gap-3.5">
              {muscles.map((muscle) => (
                <li key={muscle.muscle} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[17px] font-bold capitalize">{muscle.muscle}</span>
                    <span className="text-[15px] font-semibold text-white/60">
                      <span className="text-lg font-extrabold text-white">{muscle.sets}</span> {t("muscles.sets")} ·{" "}
                      {muscle.delta === 0 ? t("muscles.same") : `${muscle.delta > 0 ? "+" : "−"}${Math.abs(muscle.delta)}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#a6ff00]"
                      style={{ width: `${(muscle.sets / topMuscle) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-white/60">{t("muscles.empty")}</p>
          )}
        </Card>

        <Card title={t("strength.title")} subtitle={t("strength.subtitle")}>
          {series.length ? (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">{t("strength.exercise")}</span>
                <select
                  value={exerciseKey ?? ""}
                  onChange={(event) => setChosenExercise(event.target.value)}
                  className="h-12 rounded-2xl border border-white/[0.13] bg-white/[0.065] px-4 text-base font-semibold text-white"
                >
                  {options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black leading-none">{number.format(last.value)}</span>
                <span className="text-lg font-bold text-white/60">kg</span>
                {series.length > 1 ? (
                  <span className="text-[15px] font-semibold text-white/60">
                    <span className="font-extrabold text-white">
                      {gain > 0 ? "+" : gain < 0 ? "−" : ""}
                      {number.format(Math.abs(gain))} kg
                    </span>{" "}
                    {t("strength.sinceFirst")}
                  </span>
                ) : null}
              </div>
              <LineChart
                points={series}
                ariaLabel={t("strength.chartAria", {
                  exercise: exerciseName,
                  from: number.format(first.value),
                  fromDate: shortDate(first.date),
                  to: number.format(last.value),
                  toDate: shortDate(last.date),
                })}
                formatValue={(value) => `${number.format(value)} kg`}
                formatDate={shortDate}
              />
            </>
          ) : (
            <p className="text-base text-white/60">{t("strength.empty")}</p>
          )}
        </Card>
      </div>

      <Card title={t("recent.title")}>
        {recentLogs.length ? (
          <ul className="flex flex-col">
            {recentLogs.map((log) => {
              const dayId = log.routine_day_id || log.routine_day || "";
              const dayName = dayNames.get(dayId) ?? "";
              return (
                <li key={log.id} className="flex items-center gap-3.5 border-b border-white/10 py-3.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/60">{longDate(log.date)}</p>
                    <p className="mt-0.5 truncate text-lg font-extrabold">{dayName || t("recent.session")}</p>
                    <p className="text-[15px] font-semibold text-white/60">
                      {log.completed ? t("recent.completed") : t("recent.notCompleted")}
                    </p>
                  </div>
                  {dayId ? (
                    <Link
                      href={`/${locale}/routine/${dayId}`}
                      aria-label={t("recent.viewDayAria", { day: dayName || t("recent.session"), date: longDate(log.date) })}
                      className="flex min-h-11 items-center rounded-full border border-white/[0.22] px-4 text-[15px] font-bold"
                    >
                      {t("recent.viewDay")}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-base text-white/60">{t("recent.empty")}</p>
        )}
      </Card>
    </div>
  );
}

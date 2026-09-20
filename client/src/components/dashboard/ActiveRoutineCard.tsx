"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, Play } from "lucide-react";

import { AthleteSilhouette } from "@/components/ui/AthleteSilhouette";
import { useFeaturedTrainingDay } from "@/hooks/useFeaturedTrainingDay";
import type { Routine } from "@/types/routine";

type ActiveRoutineCardProps = {
  routine: Routine;
  href: string;
  /** Deep link to a specific day; when given, "start workout" opens the featured day. */
  dayHref?: (dayId: string) => string;
  labels: {
    upNext: string;
    startWorkout: string;
    exercises: string;
    title: string;
  };
};

export function ActiveRoutineCard({ routine, href, dayHref, labels }: ActiveRoutineCardProps) {
  const t = useTranslations("Dashboard.activeRoutine");
  const { day: trainingDay, restToday, when } = useFeaturedTrainingDay(routine);

  const estimateMinutes = trainingDay ? Math.max(30, trainingDay.exercises.length * 12) : 30;
  const startHref = trainingDay && dayHref ? dayHref(trainingDay.id) : href;

  return (
    <section className="relative min-h-[19rem] overflow-hidden rounded-[2rem] bg-white/[0.065] backdrop-blur-xl md:min-h-[22rem]">
      <div className="pointer-events-none absolute -right-6 top-6 size-72 rounded-full bg-[#a6ff00]/40 blur-[60px] md:size-[26rem]" />
      <AthleteSilhouette className="pointer-events-none absolute -right-2 bottom-0 h-[70%] max-h-72 w-auto opacity-90 md:h-[85%] md:max-h-96" />
      <div className="relative flex h-full flex-col gap-3 p-6 md:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a6ff00] md:text-sm">
          {labels.upNext}
          {when ? ` · ${when}` : ""}
        </p>
        {restToday ? <p className="text-sm font-bold text-[#d7ff8a]">{t("restToday")}</p> : null}
        <h2 className="max-w-[13rem] text-4xl font-black leading-[1.02] tracking-tight md:max-w-sm md:text-5xl">
          {trainingDay?.day_name ?? labels.title}
        </h2>
        <p className="flex items-center gap-2 text-base font-medium text-white/65 md:text-lg">
          <Clock aria-hidden="true" size={20} strokeWidth={1.5} />
          <span>
            {trainingDay?.exercises.length ?? 0} {labels.exercises} · ~{estimateMinutes} min
          </span>
        </p>
        <Link
          href={startHref}
          className="apex-button mt-auto flex h-[62px] w-full items-center justify-center gap-2.5 rounded-[1.9375rem] text-lg font-extrabold md:w-fit md:min-w-80 md:px-8"
        >
          <Play aria-hidden="true" size={22} fill="currentColor" strokeWidth={0} />
          {labels.startWorkout}
        </Link>
      </div>
    </section>
  );
}

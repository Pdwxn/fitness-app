import Link from "next/link";

import type { Routine } from "@/types/routine";

type ActiveRoutineCardProps = {
  routine: Routine;
  href: string;
  labels: {
    eyebrow: string;
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

export function ActiveRoutineCard({ routine, href, labels }: ActiveRoutineCardProps) {
  const firstTrainingDay = getFirstTrainingDay(routine);
  const activeDays = countActiveDays(routine);
  const estimateMinutes = firstTrainingDay ? Math.max(30, firstTrainingDay.exercises.length * 12) : 30;

  return (
    <section className="apex-card relative overflow-hidden rounded-[2rem] text-white">
      <div className="pointer-events-none absolute -right-10 -top-12 size-52 rounded-full bg-[#a6ff00]/20 blur-3xl" />
      <div className="relative p-6 md:p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">Up next</p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm text-white/55">{labels.eyebrow}</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              {firstTrainingDay?.day_name ?? `${labels.title} ${routine.month}/${routine.year}`}
            </h2>
            <p className="mt-3 text-base leading-7 text-white/65">
              ~ {estimateMinutes} min · {firstTrainingDay?.exercises.length ?? 0} exercises
            </p>
          </div>
          <Link href={href} className="apex-button w-fit rounded-2xl px-5 py-3 text-sm font-black">
            Start workout →
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
            {firstTrainingDay?.day_name ?? labels.restDay}
          </span>
          {labels.nextWorkout}
        </div>
      </div>
    </section>
  );
}

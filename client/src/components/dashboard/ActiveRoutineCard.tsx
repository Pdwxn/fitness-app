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

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#ded2bf] bg-[#17130f] text-white shadow-xl">
      <div className="p-6 md:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d49b50]">
          {labels.eyebrow}
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">
              {labels.title} {routine.month}/{routine.year}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              {labels.description}
            </p>
          </div>
          <Link
            href={href}
            className="w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-[#17130f] transition hover:bg-[#f2d6a6]"
          >
            {labels.cta}
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-white/10 text-center text-sm font-bold text-white/70">
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

"use client";

import { useState } from "react";

import type { Routine, RoutineDay } from "@/types/routine";

import { ExercisePreviewList } from "./ExercisePreviewList";

type WeeklyRoutinePreviewProps = {
  routine: Routine;
  labels: {
    title: string;
    week: string;
    restDay: string;
    exercises: string;
    selectedDay: {
      title: string;
      restDay: string;
      sets: string;
      reps: string;
      rest: string;
      weight: string;
      seconds: string;
      empty: string;
    };
  };
};

function getFirstTrainingDay(days: RoutineDay[]) {
  return days.find((day) => !day.is_rest_day) ?? days[0] ?? null;
}

export function WeeklyRoutinePreview({ routine, labels }: WeeklyRoutinePreviewProps) {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const selectedWeek = routine.weeks[selectedWeekIndex] ?? routine.weeks[0];
  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    getFirstTrainingDay(selectedWeek?.days ?? [])?.id ?? null,
  );
  const selectedDay = selectedWeek?.days.find((day) => day.id === selectedDayId) ?? null;

  function selectWeek(index: number) {
    const week = routine.weeks[index];
    setSelectedWeekIndex(index);
    setSelectedDayId(getFirstTrainingDay(week?.days ?? [])?.id ?? null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-2xl font-black tracking-tight">{labels.title}</h3>
          <div className="flex flex-wrap gap-2">
            {routine.weeks.map((week, index) => (
              <button
                key={week.id}
                type="button"
                onClick={() => selectWeek(index)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  selectedWeek?.id === week.id
                    ? "bg-[#17130f] text-white"
                    : "bg-[#f7f3ec] text-[#5c5349] hover:bg-[#eadfce]"
                }`}
              >
                {labels.week} {week.week_number}
              </button>
            ))}
          </div>
        </div>

        {selectedWeek ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {selectedWeek.days.map((day) => {
              const isSelected = selectedDay?.id === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    isSelected
                      ? "border-[#17130f] bg-[#17130f] text-white shadow-lg"
                      : "border-transparent bg-[#f7f3ec] text-[#17130f] hover:border-[#d8c6aa]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">
                        {labels.week} {selectedWeek.week_number} · {day.day_number}
                      </p>
                      <p className="mt-1 text-lg font-black">{day.day_name}</p>
                    </div>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                      {day.is_rest_day
                        ? labels.restDay
                        : `${day.exercises.length} ${labels.exercises}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <ExercisePreviewList day={selectedDay} labels={labels.selectedDay} />
    </div>
  );
}

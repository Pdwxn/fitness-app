"use client";

import { useTranslations } from "next-intl";

import { useRoutineBuilderStore } from "@/store/routineBuilderStore";
import type { DraftWeek } from "@/types/routine";

import { RoutineDayEditor } from "./RoutineDayEditor";

type RoutineWeekEditorProps = {
  weekIdx: number;
  week: DraftWeek;
  canRemove: boolean;
};

export function RoutineWeekEditor({ weekIdx, week, canRemove }: RoutineWeekEditorProps) {
  const t = useTranslations("Builder");
  const { setWeekField, addDay, removeWeek } = useRoutineBuilderStore();

  return (
    <section className="apex-card rounded-[1.5rem] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">
          {t("week")} {week.week_number}
        </h3>
        {canRemove ? (
          <button
            type="button"
            onClick={() => removeWeek(weekIdx)}
            className="text-xs font-bold text-red-300"
          >
            {t("removeWeek")}
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={week.focus}
          onChange={(event) => setWeekField(weekIdx, { focus: event.target.value })}
          placeholder={t("focus")}
          className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
        />
        <input
          value={week.notes}
          onChange={(event) => setWeekField(weekIdx, { notes: event.target.value })}
          placeholder={t("notes")}
          className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
        />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {week.days.map((day, dayIdx) => (
          <RoutineDayEditor
            key={dayIdx}
            weekIdx={weekIdx}
            dayIdx={dayIdx}
            day={day}
            canRemove={week.days.length > 1}
          />
        ))}
      </div>

      {week.days.length < 7 ? (
        <button
          type="button"
          onClick={() => addDay(weekIdx)}
          className="apex-button-outline mt-3 w-full rounded-xl py-2 text-xs font-black"
        >
          {t("addDay")}
        </button>
      ) : null}
    </section>
  );
}

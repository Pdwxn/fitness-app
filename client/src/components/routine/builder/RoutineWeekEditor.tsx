"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { useRoutineBuilderStore, type DraftValidationError } from "@/store/routineBuilderStore";
import type { DraftWeek } from "@/types/routine";

import { RoutineDayEditor } from "./RoutineDayEditor";

type RoutineWeekEditorProps = {
  weekIdx: number;
  week: DraftWeek;
  locale: string;
  /** This week's own validation errors, split out per day inside `RoutineDayEditor`. */
  errors: DraftValidationError[];
};

export function RoutineWeekEditor({ weekIdx, week, locale, errors }: RoutineWeekEditorProps) {
  const t = useTranslations("Builder");
  const { addDay } = useRoutineBuilderStore();

  return (
    <div className="flex flex-col gap-3.5">
      {week.days.map((day, dayIdx) => (
        <RoutineDayEditor
          key={dayIdx}
          weekIdx={weekIdx}
          dayIdx={dayIdx}
          day={day}
          locale={locale}
          canRemove={week.days.length > 1}
          errors={errors.filter(
            (error) => "dayNumber" in error && error.dayNumber === day.day_number,
          )}
        />
      ))}

      {week.days.length < 7 ? (
        <button
          type="button"
          onClick={() => addDay(weekIdx)}
          className="flex h-[52px] items-center justify-center gap-2 rounded-[26px] border-[1.5px] border-white/30 text-base font-bold"
        >
          <Plus aria-hidden="true" size={22} strokeWidth={1.8} />
          {t("addDay")}
        </button>
      ) : null}
    </div>
  );
}

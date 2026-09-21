"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Moon, Save } from "lucide-react";

import { useDailyLogs } from "@/hooks/useDailyLogs";
import { saveLogLocally } from "@/lib/sync";
import type { DailyLog } from "@/types/progress";
import type { RoutineDay } from "@/types/routine";

function todayDate() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Rest days have no exercises to log, but a note ("how did you feel?") is still real, useful data. */
export function RestDayLogForm({ day }: { day: RoutineDay }) {
  const t = useTranslations("RoutineDay");
  const date = todayDate();
  const { logs, refreshLogs } = useDailyLogs({ routineDayId: day.id });
  const existingLog = logs.find((log) => log.date === date) ?? null;
  const [logId, setLogId] = useState(existingLog?.id ?? createId());
  const [dayNote, setDayNote] = useState(existingLog?.day_note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!existingLog) return;
    setLogId(existingLog.id);
    setDayNote(existingLog.day_note);
  }, [existingLog]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const log: DailyLog = {
        id: logId,
        routine_day_id: day.id,
        date,
        completed: true,
        day_note: dayNote,
        exercises_done: [],
      };
      await saveLogLocally(log);
      setSaveStatus(t("tracker.savedLocal"));
      refreshLogs();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-5 border-t border-white/[0.13] pt-7">
        <div className="grid size-[4.5rem] place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/10 text-[#a6ff00]">
          <Moon aria-hidden="true" size={34} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[28px] font-black leading-tight tracking-tight">{t("restDayCard.title")}</p>
          <p className="mt-1 text-lg font-medium text-white/60">{t("restDayCard.subtitle")}</p>
        </div>
      </div>

      <label className="block">
        <span className="text-lg font-bold">{t("tracker.dayNote")}</span>
        <textarea
          value={dayNote}
          onChange={(event) => setDayNote(event.target.value)}
          placeholder={t("restDayCard.notePlaceholder")}
          rows={3}
          className="apex-input mt-2 min-h-[6.5rem] w-full resize-none rounded-[1.25rem] px-4 py-3.5 text-base"
        />
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="apex-button flex h-[62px] items-center justify-center gap-2.5 rounded-[1.9375rem] text-lg font-extrabold disabled:opacity-60"
      >
        <Save aria-hidden="true" size={22} strokeWidth={2} />
        {isSaving ? t("tracker.saving") : t("tracker.save")}
      </button>
      {saveStatus ? (
        <p aria-live="polite" className="text-center text-sm font-medium text-white/60">
          {saveStatus}
        </p>
      ) : null}
    </div>
  );
}

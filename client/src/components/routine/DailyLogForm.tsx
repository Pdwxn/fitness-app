"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Save, WifiOff } from "lucide-react";

import { useDailyLogs } from "@/hooks/useDailyLogs";
import { buildExerciseLog, ensureSets, sanitizeExerciseLog } from "@/lib/setLog";
import { saveLogLocally } from "@/lib/sync";
import type { DailyLog, ExerciseLog } from "@/types/progress";
import type { RoutineDay } from "@/types/routine";

import { ExerciseListRow } from "./ExerciseListRow";
import { ExerciseSheetContent } from "./ExerciseSheetContent";

type DailyLogFormProps = {
  day: RoutineDay;
};

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

/**
 * One entry per exercise of the day, in the day's order. Entries from an
 * already saved log are kept (older logs get per-set rows built from their
 * totals); exercises added to the routine since (e.g. by the AI coach) get a
 * fresh entry; entries for exercises no longer in the routine stay at the end
 * so nothing already logged disappears.
 */
function buildExerciseLogs(day: RoutineDay, saved: ExerciseLog[] = []): ExerciseLog[] {
  const savedById = new Map(saved.map((entry) => [entry.exercise_id, entry]));
  const current = day.exercises.map((exercise) => {
    const entry = savedById.get(exercise.id);
    return entry ? ensureSets(entry, exercise) : buildExerciseLog(exercise);
  });
  const known = new Set(day.exercises.map((exercise) => exercise.id));
  const orphaned = saved.filter((entry) => !known.has(entry.exercise_id)).map((entry) => ensureSets(entry));
  return [...current, ...orphaned];
}

/** Fixed backdrop + slide-up panel, portaled to escape any blurred/positioned ancestor, and body-scroll-locked while open. */
function MobileSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const t = useTranslations("RoutineDay.sheet");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label={t("closeBackdrop")}
        onClick={onClose}
        className="absolute inset-0 size-full border-0 bg-black/70 p-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border-t border-white/20 bg-[#111411] p-5 pb-7 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]"
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/30" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DailyLogForm({ day }: DailyLogFormProps) {
  const t = useTranslations("RoutineDay");
  const tSheet = useTranslations("RoutineDay.sheet");
  const date = todayDate();
  const { logs, refreshLogs } = useDailyLogs({ routineDayId: day.id });
  const existingLog = logs.find((log) => log.date === date) ?? null;
  const [logId, setLogId] = useState(existingLog?.id ?? createId());
  const [completed, setCompleted] = useState(existingLog?.completed ?? false);
  const [dayNote, setDayNote] = useState(existingLog?.day_note ?? "");
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(
    buildExerciseLogs(day, existingLog?.exercises_done),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!existingLog) return;
    setLogId(existingLog.id);
    setCompleted(existingLog.completed);
    setDayNote(existingLog.day_note);
    setExerciseLogs(buildExerciseLogs(day, existingLog.exercises_done));
    // `day` is deliberately not a dependency: a background refetch of the routine
    // must not throw away sets the user is in the middle of typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingLog]);

  function updateExerciseLog(exerciseId: string, update: (entry: ExerciseLog) => ExerciseLog) {
    setExerciseLogs((current) =>
      current.map((exerciseLog) => (exerciseLog.exercise_id === exerciseId ? update(exerciseLog) : exerciseLog)),
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const log: DailyLog = {
        id: logId,
        routine_day_id: day.id,
        date,
        completed,
        day_note: dayNote,
        exercises_done: exerciseLogs.map(sanitizeExerciseLog),
      };

      await saveLogLocally(log);
      setSaveStatus(t("tracker.savedLocal"));
      refreshLogs();
    } finally {
      setIsSaving(false);
    }
  }

  const trainingExercises = day.exercises;
  const trainingLogs = exerciseLogs.slice(0, trainingExercises.length);
  const doneCount = trainingLogs.filter((log) => log.completed).length;
  const total = trainingExercises.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const selectedExercise = trainingExercises[selectedIndex] ?? null;
  const selectedLog = selectedExercise ? trainingLogs[selectedIndex] : null;
  const isLast = selectedIndex >= total - 1;

  function selectExercise(index: number) {
    setSelectedIndex(index);
    setSheetOpen(true);
  }

  function advance() {
    if (!isLast) {
      setSelectedIndex((index) => index + 1);
    } else {
      setSheetOpen(false);
    }
  }

  function renderSheet(onClose?: () => void) {
    if (!selectedExercise || !selectedLog) return null;
    return (
      <ExerciseSheetContent
        exercise={selectedExercise}
        log={selectedLog}
        onChange={(update) => updateExerciseLog(selectedExercise.id, update)}
        onClose={onClose}
        onAdvance={advance}
        isLast={isLast}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {total > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <p className="text-base font-bold">{t("progress", { done: doneCount, total })}</p>
            <p className="text-2xl font-black text-[#a6ff00]">{percent}%</p>
          </div>
          <div
            role="progressbar"
            aria-label={t("progress", { done: doneCount, total })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2.5 overflow-hidden rounded-full bg-white/[0.14]"
          >
            <div className="h-full rounded-full bg-[#a6ff00] transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[400px_minmax(0,1fr)] md:items-start">
        <div className="flex flex-col border-t border-white/[0.13] md:border-t-0">
          {trainingExercises.map((exercise, index) => (
            <ExerciseListRow
              key={exercise.id}
              exercise={exercise}
              log={trainingLogs[index]}
              isSelected={index === selectedIndex}
              onSelect={() => selectExercise(index)}
              ariaLabel={tSheet("rowAriaLabel", {
                name: exercise.name,
                done: trainingLogs[index].sets?.filter((set) => set.completed).length ?? 0,
                total: trainingLogs[index].sets?.length ?? exercise.sets ?? 0,
              })}
            />
          ))}
        </div>

        <div className="apex-card hidden rounded-[2rem] p-6 md:block">{renderSheet()}</div>
      </div>

      {sheetOpen && selectedExercise ? (
        <MobileSheet onClose={() => setSheetOpen(false)}>{renderSheet(() => setSheetOpen(false))}</MobileSheet>
      ) : null}

      <div className="flex flex-col gap-3.5 border-t border-white/[0.13] pt-4">
        <label className="block">
          <span className="text-sm font-black text-white/80">{t("tracker.dayNote")}</span>
          <input
            value={dayNote}
            onChange={(event) => setDayNote(event.target.value)}
            placeholder={t("tracker.dayNotePlaceholder")}
            className="apex-input mt-2 w-full rounded-2xl px-4 py-3 text-base"
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <span id="daily-log-completed-label" className="text-lg font-bold">
            {t("tracker.completedDay")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={completed}
            aria-labelledby="daily-log-completed-label"
            onClick={() => setCompleted((value) => !value)}
            className={`relative h-[38px] w-16 shrink-0 rounded-full border-[1.5px] transition-colors ${
              completed ? "border-[#a6ff00] bg-[#a6ff00]/20" : "border-white/30 bg-transparent"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1/2 size-7 -translate-y-1/2 rounded-full transition-[left] ${
                completed ? "left-[calc(100%-1.75rem-3px)] bg-[#a6ff00]" : "left-1 bg-white/60"
              }`}
            />
          </button>
        </div>

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
          <p aria-live="polite" className="flex items-center justify-center gap-2 text-center text-sm font-medium text-white/60">
            <WifiOff aria-hidden="true" size={18} strokeWidth={1.5} />
            {saveStatus}
          </p>
        ) : null}
      </div>
    </div>
  );
}

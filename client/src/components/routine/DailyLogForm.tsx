"use client";

import { useEffect, useState } from "react";

import { useDailyLogs } from "@/hooks/useDailyLogs";
import { getPendingLogs, saveLogLocally, syncPendingLogs } from "@/lib/sync";
import type { DailyLog, ExerciseLog } from "@/types/progress";
import type { RoutineDay } from "@/types/routine";

type DailyLogFormProps = {
  day: RoutineDay;
  labels: {
    title: string;
    description: string;
    completedDay: string;
    dayNote: string;
    dayNotePlaceholder: string;
    exerciseCompleted: string;
    actualSets: string;
    actualReps: string;
    actualWeight: string;
    exerciseNote: string;
    exerciseNotePlaceholder: string;
    save: string;
    saving: string;
    savedLocal: string;
    synced: string;
  };
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildExerciseLogs(day: RoutineDay): ExerciseLog[] {
  return day.exercises.map((exercise) => ({
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    completed: false,
    actual_sets: exercise.sets,
    actual_reps: exercise.reps || null,
    actual_weight_kg: exercise.weight_kg,
    note: "",
  }));
}

export function DailyLogForm({ day, labels }: DailyLogFormProps) {
  const date = todayDate();
  const { logs, refreshLogs } = useDailyLogs({ routineDayId: day.id });
  const existingLog = logs.find((log) => log.date === date) ?? null;
  const [logId, setLogId] = useState(existingLog?.id ?? createId());
  const [completed, setCompleted] = useState(existingLog?.completed ?? false);
  const [dayNote, setDayNote] = useState(existingLog?.day_note ?? "");
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(
    existingLog?.exercises_done ?? buildExerciseLogs(day),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!existingLog) return;
    setLogId(existingLog.id);
    setCompleted(existingLog.completed);
    setDayNote(existingLog.day_note);
    setExerciseLogs(existingLog.exercises_done);
  }, [existingLog]);

  function updateExerciseLog(exerciseId: string, update: Partial<ExerciseLog>) {
    setExerciseLogs((current) =>
      current.map((exerciseLog) =>
        exerciseLog.exercise_id === exerciseId ? { ...exerciseLog, ...update } : exerciseLog,
      ),
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
        exercises_done: exerciseLogs,
      };

      saveLogLocally(log);
      setSaveStatus(labels.savedLocal);

      await syncPendingLogs();
      refreshLogs();
      setSaveStatus(getPendingLogs().length ? labels.savedLocal : labels.synced);
    } finally {
      setIsSaving(false);
    }
  }

  if (day.is_rest_day) return null;

  return (
    <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e34]">
            {labels.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#5c5349]">{labels.description}</p>
        </div>
        <label className="flex items-center gap-2 rounded-full bg-[#f7f3ec] px-4 py-2 text-sm font-black text-[#17130f]">
          <input
            type="checkbox"
            checked={completed}
            onChange={(event) => setCompleted(event.target.checked)}
            className="size-4 accent-[#17130f]"
          />
          {labels.completedDay}
        </label>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-black text-[#17130f]">{labels.dayNote}</span>
        <textarea
          value={dayNote}
          onChange={(event) => setDayNote(event.target.value)}
          placeholder={labels.dayNotePlaceholder}
          className="mt-2 min-h-24 w-full rounded-3xl border border-[#ded2bf] bg-[#f7f3ec] px-4 py-3 text-sm outline-none focus:border-[#8b5e34]"
        />
      </label>

      <div className="mt-5 grid gap-4">
        {exerciseLogs.map((exerciseLog) => (
          <article key={exerciseLog.exercise_id} className="rounded-3xl bg-[#f7f3ec] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-black tracking-tight">{exerciseLog.exercise_name}</h3>
                <label className="mt-2 flex items-center gap-2 text-sm font-bold text-[#5c5349]">
                  <input
                    type="checkbox"
                    checked={exerciseLog.completed}
                    onChange={(event) =>
                      updateExerciseLog(exerciseLog.exercise_id, { completed: event.target.checked })
                    }
                    className="size-4 accent-[#17130f]"
                  />
                  {labels.exerciseCompleted}
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 md:w-[22rem]">
                <NumberField
                  label={labels.actualSets}
                  value={exerciseLog.actual_sets}
                  onChange={(value) => updateExerciseLog(exerciseLog.exercise_id, { actual_sets: value })}
                />
                <TextField
                  label={labels.actualReps}
                  value={exerciseLog.actual_reps ?? ""}
                  onChange={(value) => updateExerciseLog(exerciseLog.exercise_id, { actual_reps: value })}
                />
                <TextField
                  label={labels.actualWeight}
                  value={exerciseLog.actual_weight_kg ?? ""}
                  onChange={(value) => updateExerciseLog(exerciseLog.exercise_id, { actual_weight_kg: value })}
                />
              </div>
            </div>
            <label className="mt-3 block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8b5e34]">
                {labels.exerciseNote}
              </span>
              <input
                value={exerciseLog.note}
                onChange={(event) => updateExerciseLog(exerciseLog.exercise_id, { note: event.target.value })}
                placeholder={labels.exerciseNotePlaceholder}
                className="mt-2 w-full rounded-2xl border border-[#ded2bf] bg-white px-4 py-2 text-sm outline-none focus:border-[#8b5e34]"
              />
            </label>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-[#17130f] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b241e] disabled:opacity-60"
        >
          {isSaving ? labels.saving : labels.save}
        </button>
        {saveStatus ? <p className="text-sm font-bold text-[#5c5349]">{saveStatus}</p> : null}
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8b5e34]">{label}</span>
      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="mt-1 w-full rounded-2xl border border-[#ded2bf] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b5e34]"
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8b5e34]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-[#ded2bf] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b5e34]"
      />
    </label>
  );
}

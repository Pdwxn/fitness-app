import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";

import { db, deleteMeta, getMeta, META_KEYS, setMeta } from "@/lib/db";
import type { DraftDay, DraftExercise, DraftWeek, ManualRoutineDraft, Routine } from "@/types/routine";
import { routineToDraft } from "@/types/routine";
import type { Exercise } from "@/types/exercise";

const MAX_WEEKS = 4;
const MAX_DAYS = 7;

function emptyExercise(order: number): DraftExercise {
  return {
    name: "",
    external_id: "",
    muscle_group: "",
    sets: null,
    reps: "",
    weight_kg: null,
    rest_seconds: null,
    order,
  };
}

function exerciseFromCatalog(exercise: Exercise, order: number): DraftExercise {
  return {
    name: exercise.name,
    external_id: exercise.external_id,
    muscle_group: exercise.primary_muscles[0] ?? "",
    sets: 3,
    reps: "8-12",
    weight_kg: null,
    rest_seconds: 90,
    order,
  };
}

function emptyDay(dayNumber: number): DraftDay {
  return {
    day_number: dayNumber,
    day_name: "",
    is_rest_day: false,
    exercises: [],
  };
}

function emptyWeek(weekNumber: number): DraftWeek {
  return {
    week_number: weekNumber,
    focus: "",
    notes: "",
    days: [emptyDay(1)],
  };
}

function initialDraft(): ManualRoutineDraft {
  return { weeks: [emptyWeek(1)] };
}

/** Renumber weeks / days / exercise order so everything stays contiguous from 1. */
function renumber(draft: ManualRoutineDraft): ManualRoutineDraft {
  return {
    weeks: draft.weeks.map((week, wi) => ({
      ...week,
      week_number: wi + 1,
      days: week.days.map((day, di) => ({
        ...day,
        day_number: di + 1,
        exercises: day.exercises.map((exercise, ei) => ({ ...exercise, order: ei + 1 })),
      })),
    })),
  };
}

type BuilderState = {
  draft: ManualRoutineDraft;
  hydrated: boolean;
  /** Set while editing an existing routine (`PATCH`); `null` when creating (`POST`). */
  editingRoutineId: string | null;

  hydrate: () => Promise<void>;
  /** Loads an existing routine's content for editing. Does not touch the
   * create-flow's persisted draft (`db.meta[routine_builder_draft]`), so an
   * abandoned "create" draft survives an unrelated edit session. */
  startEditing: (routine: Routine) => void;
  reset: () => void;

  setWeekField: (weekIdx: number, patch: Partial<Pick<DraftWeek, "focus" | "notes">>) => void;
  addWeek: () => void;
  removeWeek: (weekIdx: number) => void;

  addDay: (weekIdx: number) => void;
  removeDay: (weekIdx: number, dayIdx: number) => void;
  setDayName: (weekIdx: number, dayIdx: number, name: string) => void;
  /** `restLabel` fills the day's name when it doesn't have one yet, so a rest
   * day is never flagged by `validateDraft`'s "unnamed day" check. */
  toggleRestDay: (weekIdx: number, dayIdx: number, restLabel: string) => void;

  addExercise: (weekIdx: number, dayIdx: number, exercise?: Exercise) => void;
  removeExercise: (weekIdx: number, dayIdx: number, exerciseIdx: number) => void;
  setExerciseField: (
    weekIdx: number,
    dayIdx: number,
    exerciseIdx: number,
    patch: Partial<DraftExercise>,
  ) => void;
  moveExercise: (weekIdx: number, dayIdx: number, exerciseIdx: number, dir: "up" | "down") => void;
  /** Drag-and-drop: moves the exercise at `from` to position `to`. */
  reorderExercise: (weekIdx: number, dayIdx: number, from: number, to: number) => void;
  /** Replaces the draft with a template's week/day structure (no exercises: those are the user's pick). */
  applyTemplate: (days: TemplateDay[]) => void;
};

export type TemplateDay = { name: string; rest?: boolean };

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(draft: ManualRoutineDraft) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void setMeta(META_KEYS.routineBuilderDraft, JSON.stringify(draft));
  }, 400);
}

export const useRoutineBuilderStore = create<BuilderState>((set, get) => {
  const commit = (draft: ManualRoutineDraft) => {
    const next = renumber(draft);
    set({ draft: next });
    // While editing an existing routine, don't overwrite the create-flow's
    // persisted draft with edit content.
    if (!get().editingRoutineId) {
      schedulePersist(next);
    }
  };

  const mutateDay = (
    weekIdx: number,
    dayIdx: number,
    fn: (day: DraftDay) => DraftDay,
  ) => {
    const { draft } = get();
    commit({
      weeks: draft.weeks.map((week, wi) =>
        wi !== weekIdx
          ? week
          : {
              ...week,
              days: week.days.map((day, di) => (di === dayIdx ? fn(day) : day)),
            },
      ),
    });
  };

  return {
    draft: initialDraft(),
    hydrated: false,
    editingRoutineId: null,

    hydrate: async () => {
      if (get().hydrated) return;
      const raw = await getMeta(META_KEYS.routineBuilderDraft);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ManualRoutineDraft;
          if (parsed?.weeks?.length) {
            set({ draft: renumber(parsed), hydrated: true, editingRoutineId: null });
            return;
          }
        } catch {
          /* fall through to a fresh draft */
        }
      }
      set({ hydrated: true, editingRoutineId: null });
    },

    startEditing: (routine) => {
      if (persistTimer) clearTimeout(persistTimer);
      set({
        draft: renumber(routineToDraft(routine)),
        hydrated: true,
        editingRoutineId: routine.id,
      });
    },

    reset: () => {
      if (persistTimer) clearTimeout(persistTimer);
      void deleteMeta(META_KEYS.routineBuilderDraft);
      set({ draft: initialDraft(), editingRoutineId: null });
    },

    setWeekField: (weekIdx, patch) => {
      const { draft } = get();
      commit({
        weeks: draft.weeks.map((week, wi) => (wi === weekIdx ? { ...week, ...patch } : week)),
      });
    },

    addWeek: () => {
      const { draft } = get();
      if (draft.weeks.length >= MAX_WEEKS) return;
      commit({ weeks: [...draft.weeks, emptyWeek(draft.weeks.length + 1)] });
    },

    removeWeek: (weekIdx) => {
      const { draft } = get();
      if (draft.weeks.length <= 1) return;
      commit({ weeks: draft.weeks.filter((_, wi) => wi !== weekIdx) });
    },

    addDay: (weekIdx) => {
      const { draft } = get();
      const week = draft.weeks[weekIdx];
      if (!week || week.days.length >= MAX_DAYS) return;
      commit({
        weeks: draft.weeks.map((w, wi) =>
          wi === weekIdx ? { ...w, days: [...w.days, emptyDay(w.days.length + 1)] } : w,
        ),
      });
    },

    removeDay: (weekIdx, dayIdx) => {
      const { draft } = get();
      const week = draft.weeks[weekIdx];
      if (!week || week.days.length <= 1) return;
      commit({
        weeks: draft.weeks.map((w, wi) =>
          wi === weekIdx ? { ...w, days: w.days.filter((_, di) => di !== dayIdx) } : w,
        ),
      });
    },

    setDayName: (weekIdx, dayIdx, name) =>
      mutateDay(weekIdx, dayIdx, (day) => ({ ...day, day_name: name })),

    toggleRestDay: (weekIdx, dayIdx, restLabel) =>
      mutateDay(weekIdx, dayIdx, (day) => {
        const isRest = !day.is_rest_day;
        return {
          ...day,
          is_rest_day: isRest,
          exercises: isRest ? [] : day.exercises,
          day_name: isRest && !day.day_name.trim() ? restLabel : day.day_name,
        };
      }),

    addExercise: (weekIdx, dayIdx, exercise) =>
      mutateDay(weekIdx, dayIdx, (day) => {
        const nextOrder = day.exercises.length + 1;
        const entry = exercise
          ? exerciseFromCatalog(exercise, nextOrder)
          : emptyExercise(nextOrder);
        return { ...day, is_rest_day: false, exercises: [...day.exercises, entry] };
      }),

    removeExercise: (weekIdx, dayIdx, exerciseIdx) =>
      mutateDay(weekIdx, dayIdx, (day) => ({
        ...day,
        exercises: day.exercises.filter((_, ei) => ei !== exerciseIdx),
      })),

    setExerciseField: (weekIdx, dayIdx, exerciseIdx, patch) =>
      mutateDay(weekIdx, dayIdx, (day) => ({
        ...day,
        exercises: day.exercises.map((ex, ei) => (ei === exerciseIdx ? { ...ex, ...patch } : ex)),
      })),

    moveExercise: (weekIdx, dayIdx, exerciseIdx, dir) =>
      mutateDay(weekIdx, dayIdx, (day) => {
        const target = dir === "up" ? exerciseIdx - 1 : exerciseIdx + 1;
        if (target < 0 || target >= day.exercises.length) return day;
        const exercises = [...day.exercises];
        [exercises[exerciseIdx], exercises[target]] = [exercises[target], exercises[exerciseIdx]];
        return { ...day, exercises };
      }),

    reorderExercise: (weekIdx, dayIdx, from, to) =>
      mutateDay(weekIdx, dayIdx, (day) => {
        const last = day.exercises.length - 1;
        if (from === to || from < 0 || to < 0 || from > last || to > last) return day;
        return { ...day, exercises: arrayMove(day.exercises, from, to) };
      }),

    applyTemplate: (days) =>
      commit({
        weeks: [
          {
            ...emptyWeek(1),
            days: days.map((day, index) => ({
              ...emptyDay(index + 1),
              day_name: day.name,
              is_rest_day: day.rest === true,
            })),
          },
        ],
      }),
  };
});

// --- validation + queueing ------------------------------------------------- //

export type DraftValidationError =
  | { code: "no_training_day"; weekNumber: number }
  | { code: "empty_training_day"; weekNumber: number; dayNumber: number }
  | { code: "unnamed_day"; weekNumber: number; dayNumber: number }
  | { code: "unnamed_exercise"; weekNumber: number; dayNumber: number };

export function validateDraft(draft: ManualRoutineDraft): DraftValidationError[] {
  const errors: DraftValidationError[] = [];
  for (const week of draft.weeks) {
    const trainingDays = week.days.filter((d) => !d.is_rest_day);
    if (trainingDays.length === 0) {
      errors.push({ code: "no_training_day", weekNumber: week.week_number });
    }
    for (const day of week.days) {
      if (!day.day_name.trim()) {
        errors.push({
          code: "unnamed_day",
          weekNumber: week.week_number,
          dayNumber: day.day_number,
        });
      }
      if (day.is_rest_day) continue;
      if (day.exercises.length === 0) {
        errors.push({
          code: "empty_training_day",
          weekNumber: week.week_number,
          dayNumber: day.day_number,
        });
      }
      if (day.exercises.some((ex) => !ex.name.trim())) {
        errors.push({
          code: "unnamed_exercise",
          weekNumber: week.week_number,
          dayNumber: day.day_number,
        });
      }
    }
  }
  return errors;
}

export async function queuePendingRoutine(draft: ManualRoutineDraft): Promise<void> {
  await db.pendingRoutines.add({
    id: crypto.randomUUID(),
    payload: draft,
    createdAt: new Date().toISOString(),
  });
}

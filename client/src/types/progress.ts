/** One set of an exercise: what was done, and whether it was actually finished. */
export type ExerciseSet = {
  reps: string | null;
  weight_kg: string | null;
  completed: boolean;
};

export type ExerciseLog = {
  exercise_id: string;
  exercise_name: string;
  /** Stable catalog id (`StoredExercise.external_id`), when the exercise has
   * one -- lets the progression engine group logs across routines/months,
   * since `exercise_id` (a `RoutineExercise.id`) is different every time. */
  source_external_id?: string;
  /**
   * Per-set detail. The aggregate fields below are derived from it (see
   * `lib/setLog.ts`) so older readers keep working; logs saved before
   * per-set logging simply don't have it.
   */
  sets?: ExerciseSet[];
  completed: boolean;
  actual_sets: number | null;
  actual_reps: string | null;
  actual_weight_kg: string | null;
  note: string;
};

export type DailyLog = {
  id: string;
  routine_day?: string;
  routine_day_id: string;
  date: string;
  completed: boolean;
  day_note: string;
  exercises_done: ExerciseLog[];
  created_at?: string;
  updated_at?: string;
};

export type DailyLogPayload = Omit<DailyLog, "routine_day" | "created_at" | "updated_at">;

export type DailyLogBatchPayload = {
  logs: DailyLogPayload[];
};

export type DailyLogBatchResponse = {
  created: number;
  updated: number;
  logs: DailyLog[];
  next_routine?: { id: string; month: number; year: number } | null;
  next_proposal?: { id: string; target_month: number; target_year: number } | null;
};

export type ProgressStats = {
  completed_days: number;
  total_exercises_completed: number;
  pending_sync: number;
};

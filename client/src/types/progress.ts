export type ExerciseLog = {
  exercise_id: string;
  exercise_name: string;
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
};

export type ProgressStats = {
  completed_days: number;
  total_exercises_completed: number;
  pending_sync: number;
};

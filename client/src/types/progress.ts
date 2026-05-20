export type ExerciseLog = {
  exercise_id: string;
  exercise_name: string;
  completed: boolean;
  actual_sets: number | null;
  actual_reps: string | null;
  actual_weight_kg: number | null;
  note: string;
};

export type DailyLog = {
  id: string;
  routine_day_id: string;
  date: string;
  completed: boolean;
  day_note: string;
  exercises_done: ExerciseLog[];
};

export type ProgressStats = {
  completed_days: number;
  total_exercises_completed: number;
};

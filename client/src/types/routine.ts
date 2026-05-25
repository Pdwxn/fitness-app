export type RoutineVariant = {
  name: string;
  description: string;
};

export type RoutineExercise = {
  id: string;
  name: string;
  muscle_group: string;
  sets: number | null;
  reps: string;
  weight_kg: string | null;
  rest_seconds: number | null;
  image_url: string;
  video_url: string;
  variants: RoutineVariant[];
  instructions: string;
  search_term: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type RoutineDay = {
  id: string;
  day_number: number;
  day_name: string;
  is_rest_day: boolean;
  exercises: RoutineExercise[];
  created_at: string;
  updated_at: string;
};

export type RoutineWeek = {
  id: string;
  week_number: number;
  focus: string;
  notes: string;
  days: RoutineDay[];
  created_at: string;
  updated_at: string;
};

export type Routine = {
  id: string;
  month: number;
  year: number;
  is_active: boolean;
  generated_at: string | null;
  gemini_prompt_hash: string;
  weeks: RoutineWeek[];
  created_at: string;
  updated_at: string;
};

export type RoutineCache = Routine;

export type RoutineVariant = {
  name: string;
  description: string;
};

export type RoutineExercise = {
  id: string;
  name: string;
  muscle_group: string;
  source_external_id: string;
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

export type RoutineSource = "manual" | "ai_generated";

export type Routine = {
  id: string;
  source: RoutineSource;
  month: number | null;
  year: number | null;
  is_active: boolean;
  generated_at: string | null;
  gemini_prompt_hash: string;
  weeks: RoutineWeek[];
  created_at: string;
  updated_at: string;
};

export type RoutineCache = Routine;

/**
 * `MM/YYYY` for AI-generated (monthly) routines, or `null` for manual routines
 * which have no month/year. Call sites decide what to render for `null`.
 */
export function routinePeriodLabel(routine: Pick<Routine, "month" | "year">): string | null {
  return routine.month && routine.year ? `${routine.month}/${routine.year}` : null;
}

// --- Routine builder (manual) ---------------------------------------------- //

/** One exercise inside a builder draft (subset of RoutineExercise the user edits). */
export type DraftExercise = {
  name: string;
  external_id: string;
  muscle_group: string;
  sets: number | null;
  reps: string;
  weight_kg: string | null;
  rest_seconds: number | null;
  order: number;
};

export type DraftDay = {
  day_number: number;
  day_name: string;
  is_rest_day: boolean;
  exercises: DraftExercise[];
};

export type DraftWeek = {
  week_number: number;
  focus: string;
  notes: string;
  days: DraftDay[];
};

/** Payload sent to `POST /api/v1/routines/manual/`. */
export type ManualRoutineDraft = {
  weeks: DraftWeek[];
};

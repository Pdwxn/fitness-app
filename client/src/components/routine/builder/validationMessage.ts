import type { DraftValidationError } from "@/store/routineBuilderStore";

export type ValidationTranslator = (key: string, values?: Record<string, string | number>) => string;

/** One-sentence description of a draft validation error, in the user's language. */
export function describeValidationError(tv: ValidationTranslator, error: DraftValidationError): string {
  switch (error.code) {
    case "no_training_day":
      return tv("noTrainingDay", { week: error.weekNumber });
    case "empty_training_day":
      return tv("emptyTrainingDay", { week: error.weekNumber, day: error.dayNumber });
    case "unnamed_day":
      return tv("unnamedDay", { week: error.weekNumber, day: error.dayNumber });
    case "unnamed_exercise":
      return tv("unnamedExercise", { week: error.weekNumber, day: error.dayNumber });
  }
}

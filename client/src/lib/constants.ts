export const GENDER_OPTIONS = ["male", "female", "prefer_not_to_say"] as const;

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export const PHYSICAL_GOALS = ["lose_weight", "gain_muscle", "endurance", "flexibility", "general_fitness"] as const;

export const TRAINING_STYLES = ["strength", "hypertrophy", "endurance", "power", "general"] as const;

export const PRIORITY_MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "abs", "calves", "forearms"] as const;

export const INTENSITY_PREFERENCES = ["always_failure", "near_failure", "comfortable"] as const;

export const MEDICAL_CONDITIONS = ["knee_pain", "lower_back_pain", "anemia", "asthma", "hypertension", "herniated_disc", "diabetes", "tendinitis", "pregnancy", "rheumatoid_arthritis"] as const;

export const EQUIPMENT_TYPES = ["gym", "home", "calisthenics"] as const;

export const HOME_EQUIPMENT = [
  "dumbbells",
  "pull_up_bar",
  "bands",
  "kettlebell",
  "bench",
  "trx",
  "bodyweight_only",
] as const;

export const ROUTINE_TYPES = ["push_pull_legs", "upper_lower", "hybrid", "5_days"] as const;

export const DAYS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

export const SESSION_DURATIONS = [15, 30, 45, 60, 75, 90, 120] as const;

export const RECOMMENDED_ROUTINE_MAP: Record<number, string> = {
  1: "hybrid",
  2: "hybrid",
  3: "push_pull_legs",
  4: "upper_lower",
  5: "push_pull_legs",
  6: "5_days",
  7: "5_days",
};

export type Gender = (typeof GENDER_OPTIONS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type PhysicalGoal = (typeof PHYSICAL_GOALS)[number];
export type TrainingStyle = (typeof TRAINING_STYLES)[number];
export type PriorityMuscle = (typeof PRIORITY_MUSCLES)[number];
export type IntensityPreference = (typeof INTENSITY_PREFERENCES)[number];
export type MedicalCondition = (typeof MEDICAL_CONDITIONS)[number];
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
export type HomeEquipment = (typeof HOME_EQUIPMENT)[number];
export type RoutineType = (typeof ROUTINE_TYPES)[number];

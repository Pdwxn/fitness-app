export const GENDER_OPTIONS = ["male", "female", "prefer_not_to_say"] as const;

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;

export const PHYSICAL_GOALS = ["lose_weight", "gain_muscle", "endurance", "flexibility", "general_fitness"] as const;

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

export type Gender = (typeof GENDER_OPTIONS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type PhysicalGoal = (typeof PHYSICAL_GOALS)[number];
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];
export type HomeEquipment = (typeof HOME_EQUIPMENT)[number];
export type RoutineType = (typeof ROUTINE_TYPES)[number];

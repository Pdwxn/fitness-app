export type UnitSystem = "metric" | "imperial";

export type Gender = "male" | "female" | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type PhysicalGoal =
  | "lose_weight"
  | "gain_muscle"
  | "endurance"
  | "flexibility"
  | "general_fitness";

export type EquipmentType = "gym" | "home" | "calisthenics";

export type HomeEquipment =
  | "dumbbells"
  | "pull_up_bar"
  | "bands"
  | "kettlebell"
  | "bench"
  | "trx"
  | "bodyweight_only";

export type RoutineType = "push_pull_legs" | "upper_lower" | "hybrid" | "5_days";

export type Injury = {
  area: string;
  description: string;
};

export type OnboardingProfile = {
  full_name: string;
  gender: Gender | "";
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  preferred_language: "es" | "en";
  preferred_units: UnitSystem;
};

export type OnboardingHealth = {
  activity_level: ActivityLevel | "";
  physical_goals: PhysicalGoal[];
  specific_goal: string;
  injuries: Injury[];
  equipment_type: EquipmentType | "";
  available_equipment: HomeEquipment[];
  routine_type: RoutineType | "";
};

export type OnboardingPayload = {
  profile: OnboardingProfile;
  health: OnboardingHealth;
};

export type OnboardingDraft = OnboardingPayload & {
  currentStep: number;
};

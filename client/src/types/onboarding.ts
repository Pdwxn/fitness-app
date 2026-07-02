export type UnitSystem = "metric" | "imperial";

export type Gender = "male" | "female" | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PhysicalGoal =
  | "lose_weight"
  | "gain_muscle"
  | "endurance"
  | "flexibility"
  | "general_fitness";

export type TrainingStyle = "strength" | "hypertrophy" | "endurance" | "power" | "general";

export type PriorityMuscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "abs"
  | "calves"
  | "forearms";

export type IntensityPreference = "always_failure" | "near_failure" | "comfortable";

export type MedicalCondition =
  | "knee_pain"
  | "lower_back_pain"
  | "anemia"
  | "asthma"
  | "hypertension"
  | "herniated_disc"
  | "diabetes"
  | "tendinitis"
  | "pregnancy"
  | "rheumatoid_arthritis";

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
  experience_level: ExperienceLevel | "";
  physical_goals: PhysicalGoal[];
  training_style: TrainingStyle | "";
  priority_muscles: PriorityMuscle[];
  intensity_preference: IntensityPreference | "";
  specific_goal: string;
  medical_conditions: MedicalCondition[];
  injuries: Injury[];
  equipment_type: EquipmentType | "";
  available_equipment: HomeEquipment[];
  routine_type: RoutineType | "";
  days_per_week: number | null;
  session_duration_minutes: number | null;
};

export type OnboardingPayload = {
  profile: OnboardingProfile;
  health: OnboardingHealth;
};

export type OnboardingDraft = { currentStep: number } & OnboardingPayload;

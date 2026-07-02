import { z } from "zod";

export const genderSchema = z.enum(["male", "female", "prefer_not_to_say"]);

export const activityLevelSchema = z.enum(["sedentary", "light", "moderate", "active", "very_active"]);

export const experienceLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const physicalGoalSchema = z.enum([
  "lose_weight",
  "gain_muscle",
  "endurance",
  "flexibility",
  "general_fitness",
]);

export const trainingStyleSchema = z.enum(["strength", "hypertrophy", "endurance", "power", "general"]);

export const priorityMuscleSchema = z.enum([
  "chest", "back", "shoulders", "biceps", "triceps",
  "legs", "glutes", "abs", "calves", "forearms",
]);

export const intensityPreferenceSchema = z.enum(["always_failure", "near_failure", "comfortable"]);

export const medicalConditionSchema = z.enum([
  "knee_pain", "lower_back_pain", "anemia", "asthma", "hypertension",
  "herniated_disc", "diabetes", "tendinitis", "pregnancy", "rheumatoid_arthritis",
]);

export const equipmentTypeSchema = z.enum(["gym", "home", "calisthenics"]);

export const homeEquipmentSchema = z.enum([
  "dumbbells",
  "pull_up_bar",
  "bands",
  "kettlebell",
  "bench",
  "trx",
  "bodyweight_only",
]);

export const routineTypeSchema = z.enum(["push_pull_legs", "upper_lower", "hybrid", "5_days"]);

export const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  gender: genderSchema,
  age: z.number().int().min(1, "Age must be at least 1").nullable(),
  weight_kg: z.number().min(1, "Weight must be at least 1").nullable(),
  height_cm: z.number().min(1, "Height must be at least 1").nullable(),
  preferred_language: z.enum(["es", "en"]),
  preferred_units: z.enum(["metric", "imperial"]),
});

export const healthSchema = z.object({
  activity_level: activityLevelSchema,
  experience_level: experienceLevelSchema,
  physical_goals: z.array(physicalGoalSchema).min(1, "Select at least one goal"),
  training_style: trainingStyleSchema,
  priority_muscles: z.array(priorityMuscleSchema),
  intensity_preference: intensityPreferenceSchema,
  specific_goal: z.string().optional(),
  medical_conditions: z.array(medicalConditionSchema),
  equipment_type: equipmentTypeSchema,
  available_equipment: z.array(homeEquipmentSchema),
  routine_type: routineTypeSchema,
  days_per_week: z.number().int().min(1).max(7).nullable(),
  session_duration_minutes: z.number().int().min(15).max(120).nullable(),
});

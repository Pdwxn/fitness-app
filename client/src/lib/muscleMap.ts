import type { BodyZone } from "@/components/progress/bodyShapes";

export type { BodyZone };

/**
 * Real values seen in `StoredExercise.primary_muscles`/`secondary_muscles`
 * (the `hasaneyldrm/exercises-dataset` import; checked directly against
 * `server/apps/routines/data/exercises_db_v2.json`), plus the Spanish names
 * the AI coach sometimes returns. Cross-checked against openGym's own
 * mapping for the same dataset (same source, same vocabulary) rather than
 * guessed from the English alone -- e.g. "lats"/"back"/"rhomboids" all land
 * on upperBack, not a literal translation of each word.
 */
const ALIASES: Record<BodyZone, string[]> = {
  trapezius: ["traps", "trapezius", "levator scapulae", "trapecio", "trapecios"],
  deltoids: [
    "delts",
    "deltoids",
    "shoulders",
    "rear deltoids",
    "rotator cuff",
    "hombro",
    "hombros",
    "deltoides",
  ],
  chest: ["pectorals", "chest", "upper chest", "pecho", "pectoral", "pectorales"],
  upperBack: [
    "lats",
    "upper back",
    "back",
    "latissimus dorsi",
    "rhomboids",
    "dorsal",
    "dorsales",
    "espalda",
    "espalda alta",
    "romboides",
  ],
  serratus: ["serratus anterior", "serrato"],
  biceps: ["biceps", "brachialis", "bicep"],
  triceps: ["triceps", "tricep"],
  forearms: [
    "forearms",
    "grip muscles",
    "wrist extensors",
    "wrist flexors",
    "forearm",
    "antebrazo",
    "antebrazos",
  ],
  abs: ["abs", "abdominals", "core", "lower abs", "abdominales", "abdominal", "abdomen"],
  obliques: ["obliques", "oblicuos"],
  lowerBack: ["spine", "lower back", "lumbar", "zona lumbar", "espalda baja"],
  glutes: ["glutes", "abductors", "gluteo", "gluteos", "abductor", "abductores"],
  quads: ["quads", "quadriceps", "cuadriceps", "quad"],
  hamstrings: ["hamstrings", "hamstring", "femoral", "femorales", "isquiotibiales"],
  adductors: ["adductors", "inner thighs", "groin", "adductor", "aductores", "ingle"],
  hipFlexors: ["hip flexors", "flexores de cadera", "psoas"],
  calves: ["calves", "soleus", "calf", "gemelos", "pantorrillas", "soleo"],
  tibialis: ["shins", "tibialis", "tibial", "tibiales"],
};

const ZONE_BY_ALIAS = new Map<string, BodyZone>(
  (Object.entries(ALIASES) as [BodyZone, string[]][]).flatMap(([zone, names]) => names.map((name) => [name, zone] as const)),
);

function clean(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** The body zone a muscle name (English catalog or Spanish AI output) belongs to, or null if unknown. */
export function zoneForMuscle(name: string): BodyZone | null {
  return ZONE_BY_ALIAS.get(clean(name)) ?? null;
}

/** Sets per body zone from per-muscle totals; muscle names that don't map are left out. */
export function setsByZone(muscles: { muscle: string; sets: number }[]): Partial<Record<BodyZone, number>> {
  const totals: Partial<Record<BodyZone, number>> = {};
  for (const { muscle, sets } of muscles) {
    const zone = zoneForMuscle(muscle);
    if (zone) totals[zone] = (totals[zone] ?? 0) + sets;
  }
  return totals;
}

/** Gray (untrained) + light yellow -> yellow -> orange -> red, in increasing intensity. */
export const HEAT_LEVELS = 4;

/** 0 (nothing) to HEAT_LEVELS, relative to the busiest zone. */
export function heatLevel(sets: number, max: number): number {
  if (sets <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((sets / max) * HEAT_LEVELS));
}

import type { BodyZone } from "@/components/progress/bodyShapes";

export type { BodyZone };

const ALIASES: Record<BodyZone, string[]> = {
  chest: ["chest", "pecho", "pectoral", "pectorals", "pectorales"],
  shoulders: ["shoulders", "shoulder", "delts", "delt", "deltoids", "deltoides", "hombro", "hombros"],
  biceps: ["biceps", "bicep"],
  triceps: ["triceps", "tricep"],
  forearms: ["forearms", "forearm", "antebrazo", "antebrazos"],
  abs: ["abs", "abdominals", "abdominales", "abdominal", "abdomen", "core", "obliques", "oblicuos", "serratus anterior"],
  back: [
    "back",
    "lats",
    "dorsal",
    "dorsales",
    "espalda",
    "upper back",
    "traps",
    "trapezius",
    "trapecio",
    "spine",
    "lower back",
    "lumbar",
    "rhomboids",
    "romboides",
    "levator scapulae",
  ],
  glutes: ["glutes", "glute", "gluteo", "gluteos", "abductors", "abductor"],
  quads: ["quads", "quadriceps", "cuadriceps", "quad", "adductors", "adductor"],
  hamstrings: ["hamstrings", "hamstring", "femoral", "femorales", "isquiotibiales"],
  calves: ["calves", "calf", "gemelos", "pantorrillas", "soleo"],
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

export const HEAT_LEVELS = 5;

/** 0 (nothing) to HEAT_LEVELS, relative to the busiest zone. */
export function heatLevel(sets: number, max: number): number {
  if (sets <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((sets / max) * HEAT_LEVELS));
}

import type { UnitSystem } from "@/types/onboarding";

export function kgToLb(kg: number) {
  return Number((kg * 2.20462).toFixed(1));
}

export function lbToKg(lb: number) {
  return Number((lb / 2.20462).toFixed(1));
}

export function cmToFeetInches(cm: number) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);

  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }

  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number) {
  return Number(((feet * 12 + inches) * 2.54).toFixed(1));
}

export function formatWeight(weightKg: number, units: UnitSystem) {
  if (units === "imperial") {
    return `${kgToLb(weightKg)} lb`;
  }

  return `${Number(weightKg.toFixed(1))} kg`;
}

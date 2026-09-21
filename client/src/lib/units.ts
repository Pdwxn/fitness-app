import type { UnitSystem } from "@/types/onboarding";

export function kgToLb(kg: number) {
  return Number((kg * 2.20462).toFixed(1));
}

export function lbToKg(lb: number) {
  // Two decimals (what the API stores): with one, 135 lb came back as 134.9.
  return Number((lb / 2.20462).toFixed(2));
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

export type WeightUnit = "kg" | "lb";

export function weightUnitFor(units: UnitSystem): WeightUnit {
  return units === "imperial" ? "lb" : "kg";
}

function trimmed(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

/** A weight stored in kg, as the number to show in `unit` ("" when there isn't one). */
export function kgToDisplay(kg: string | number | null | undefined, unit: WeightUnit): string {
  if (kg === null || kg === undefined || kg === "") return "";
  const value = Number(kg);
  if (!Number.isFinite(value)) return "";
  return unit === "lb" ? trimmed(kgToLb(value), 1) : trimmed(value, 2);
}

/** What the user typed in `unit`, back as kg for storage. Unparseable text passes through for the validators. */
export function displayToKg(text: string, unit: WeightUnit): string {
  if (unit === "kg") return text;
  const value = Number(text.replace(",", "."));
  if (text.trim() === "" || !Number.isFinite(value)) return text;
  return trimmed(lbToKg(value), 2);
}

/** "62.5 kg" / "137.8 lb" from a kg amount. */
export function formatWeightLabel(kg: string | number | null | undefined, unit: WeightUnit): string {
  const shown = kgToDisplay(kg, unit);
  return shown ? `${shown} ${unit}` : "";
}

/** A number of kg (volume, best set...) as a number in `unit`, for charts and totals. */
export function kgToUnitNumber(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kgToLb(kg) : kg;
}

/** The progression jump in pounds: plates come in 5s and 2.5s, so 2.5 kg becomes 5 lb, not 5.5. */
export function incrementLbFor(incrementKg: number): number {
  return Math.max(2.5, Math.round((incrementKg * 2.20462) / 2.5) * 2.5);
}

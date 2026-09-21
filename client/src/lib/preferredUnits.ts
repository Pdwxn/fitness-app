import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type { UnitSystem } from "@/types/onboarding";

type SettingsCache = { preferred_language?: "es" | "en"; preferred_units?: UnitSystem };

export const UNITS_CHANGED_EVENT = "apex:units-changed";

export function getPreferredUnits(): UnitSystem | null {
  return getFromStorage<SettingsCache>(STORAGE_KEYS.SETTINGS)?.preferred_units ?? null;
}

/** Remembers the unit system on this device so every screen can show weights in it. */
export function setPreferredUnits(units: UnitSystem) {
  const current = getFromStorage<SettingsCache>(STORAGE_KEYS.SETTINGS) ?? {};
  if (current.preferred_units === units) return;
  setInStorage(STORAGE_KEYS.SETTINGS, { ...current, preferred_units: units });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(UNITS_CHANGED_EVENT));
}

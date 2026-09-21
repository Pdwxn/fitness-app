"use client";

import { useEffect, useSyncExternalStore } from "react";

import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getPreferredUnits, setPreferredUnits, UNITS_CHANGED_EVENT } from "@/lib/preferredUnits";
import { weightUnitFor, type WeightUnit } from "@/lib/units";
import type { OnboardingProfile } from "@/types/onboarding";

function subscribe(onChange: () => void) {
  window.addEventListener(UNITS_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(UNITS_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let fetchedFromProfile = false;

/** kg or lb, from the unit system in the user's profile (cached on this device). */
export function useWeightUnit(): WeightUnit {
  const units = useSyncExternalStore(subscribe, getPreferredUnits, () => null);

  useEffect(() => {
    // A device that never opened the profile has no cached setting yet.
    if (units !== null || fetchedFromProfile) return;
    fetchedFromProfile = true;
    authenticatedClientFetch<OnboardingProfile>("/api/v1/profile/")
      .then((profile) => setPreferredUnits(profile.preferred_units))
      .catch(() => undefined); // metric until it can be fetched; not retried this page load
  }, [units]);

  return weightUnitFor(units ?? "metric");
}

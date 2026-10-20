"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { BodyGender } from "@/components/progress/bodyShapes";
import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type { OnboardingProfile } from "@/types/onboarding";

/** `null` when the profile hasn't been cached on this device yet -- a primitive
 * (or null), not the whole profile object, so useSyncExternalStore's snapshot
 * comparison is stable across renders. */
function cachedGender(): BodyGender | null {
  const gender = getFromStorage<OnboardingProfile>(STORAGE_KEYS.PROFILE)?.gender;
  return gender === "female" || gender === "male" ? gender : gender === undefined ? null : "male";
}

/** Fired after the one-time profile fetch below, so this tab notices too (`storage` alone only fires in *other* tabs). */
const PROFILE_FETCHED_EVENT = "apex:body-variant-profile-fetched";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PROFILE_FETCHED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PROFILE_FETCHED_EVENT, onChange);
  };
}

let fetchedFromProfile = false;

/**
 * Which body the muscle map draws: the female figure only when the profile
 * says so; male otherwise -- including "prefer not to say" and a profile
 * that hasn't been fetched yet on this device (fetched once, same pattern
 * as useWeightUnit; male until then).
 */
export function useBodyVariant(): BodyGender {
  const gender = useSyncExternalStore(subscribe, cachedGender, () => null);

  useEffect(() => {
    if (gender !== null || fetchedFromProfile) return;
    fetchedFromProfile = true;
    authenticatedClientFetch<OnboardingProfile>("/api/v1/profile/")
      .then((profile) => {
        setInStorage(STORAGE_KEYS.PROFILE, profile);
        window.dispatchEvent(new Event(PROFILE_FETCHED_EVENT));
      })
      .catch(() => undefined); // male until it can be fetched; not retried this page load
  }, [gender]);

  return gender ?? "male";
}

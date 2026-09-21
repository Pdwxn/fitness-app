"use client";

import { useTranslations } from "next-intl";

import { useChangeProgressionPolicy, useExercisePolicyPref } from "@/hooks/useProgression";
import type { ProgressionPolicy } from "@/lib/progression";
import type { RoutineExercise } from "@/types/routine";

const CHOICES: Array<ProgressionPolicy | "auto"> = ["auto", "off", "linear", "double", "greyskull"];

/**
 * Lets the user pick how the suggestion above is worked out for this exercise.
 * Local to the device (see `progressionPrefs`); "auto" follows the experience level.
 */
export function ProgressionPolicySelect({ exercise }: { exercise: RoutineExercise }) {
  const t = useTranslations("RoutineDay.progression.policy");
  const sourceId = exercise.source_external_id;
  const pref = useExercisePolicyPref(sourceId);
  const change = useChangeProgressionPolicy();

  // Without a catalog id there is no history to derive anything from.
  if (!sourceId) return null;

  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-white/70">
      <span>{t("label")}</span>
      <select
        value={pref ?? "auto"}
        onChange={(event) => void change(sourceId, event.target.value as ProgressionPolicy | "auto")}
        className="apex-input rounded-xl px-3 py-2 text-sm"
      >
        {CHOICES.map((choice) => (
          <option key={choice} value={choice}>
            {t(choice)}
          </option>
        ))}
      </select>
    </label>
  );
}

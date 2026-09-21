"use client";

import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

import { useProgressionSuggestion } from "@/hooks/useProgression";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import type { ProgressionKind } from "@/lib/progression";
import { incrementLbFor, kgToLb } from "@/lib/units";
import type { RoutineExercise } from "@/types/routine";

/** Kinds worth showing a badge for -- "no history yet" or "off" would just be noise. */
const ACTIONABLE_KINDS: ProgressionKind[] = [
  "repeat_incomplete_sets",
  "repeat_missed_reps",
  "increase_reps",
  "increase_weight",
];

export function ProgressionBadge({ exercise }: { exercise: RoutineExercise }) {
  const t = useTranslations("RoutineDay.progression");
  const suggestion = useProgressionSuggestion(exercise);
  const unit = useWeightUnit();

  if (!suggestion || !ACTIONABLE_KINDS.includes(suggestion.kind)) return null;

  // The engine works in kg. In pounds the jump is re-expressed in plate-sized
  // steps from the last weight, instead of converting "+2.5 kg" to "+5.5 lb".
  let increment = suggestion.params?.increment;
  let nextWeight = suggestion.nextWeightKg;
  if (unit === "lb" && typeof increment === "number") {
    const incrementLb = incrementLbFor(increment);
    if (nextWeight != null) {
      const lastLb = Math.round(kgToLb(nextWeight - increment) * 2) / 2;
      nextWeight = lastLb + incrementLb;
    }
    increment = incrementLb;
  } else if (nextWeight != null) {
    nextWeight = Number(nextWeight.toFixed(2));
  }

  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-[#a6ff00]/35 bg-[#a6ff00]/10 px-3.5 py-3 text-sm font-semibold leading-snug text-[#a6ff00]">
      <Lightbulb aria-hidden="true" size={20} strokeWidth={1.6} className="mt-0.5 shrink-0" />
      <span>
        {t(`reasons.${suggestion.kind}`, { ...suggestion.params, ...(increment === undefined ? {} : { increment }), unit })}
        {suggestion.kind === "increase_weight" && nextWeight != null
          ? ` (${t("nextWeight", { weight: nextWeight, reps: suggestion.nextReps ?? "", unit })})`
          : ""}
      </span>
    </div>
  );
}

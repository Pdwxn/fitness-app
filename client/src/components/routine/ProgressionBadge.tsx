"use client";

import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

import { useProgressionSuggestion } from "@/hooks/useProgression";
import type { ProgressionKind } from "@/lib/progression";
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

  if (!suggestion || !ACTIONABLE_KINDS.includes(suggestion.kind)) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-[#a6ff00]/35 bg-[#a6ff00]/10 px-3.5 py-3 text-sm font-semibold leading-snug text-[#a6ff00]">
      <Lightbulb aria-hidden="true" size={20} strokeWidth={1.6} className="mt-0.5 shrink-0" />
      <span>
        {t(`reasons.${suggestion.kind}`, suggestion.params)}
        {suggestion.kind === "increase_weight" && suggestion.nextWeightKg != null
          ? ` (${t("nextWeight", { weight: suggestion.nextWeightKg, reps: suggestion.nextReps ?? "" })})`
          : ""}
      </span>
    </div>
  );
}

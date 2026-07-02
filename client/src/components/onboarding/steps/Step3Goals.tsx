import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { INTENSITY_PREFERENCES, PHYSICAL_GOALS, PRIORITY_MUSCLES, TRAINING_STYLES } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { PhysicalGoal, PriorityMuscle, TrainingStyle } from "@/types/onboarding";

const goals = [...PHYSICAL_GOALS];
const muscles = [...PRIORITY_MUSCLES];
const intensities = [...INTENSITY_PREFERENCES];
const styles = [...TRAINING_STYLES];

const GOAL_TO_STYLE: Record<string, TrainingStyle> = {
  gain_muscle: "hypertrophy",
  lose_weight: "endurance",
  endurance: "endurance",
  flexibility: "general",
  general_fitness: "general",
};

export function Step3Goals() {
  const t = useTranslations("Onboarding.form.goals");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  const firstGoal = health.physical_goals[0] as PhysicalGoal | undefined;

  const suggestedStyle = useMemo(
    () => (firstGoal ? GOAL_TO_STYLE[firstGoal] : undefined),
    [firstGoal],
  );

  useEffect(() => {
    if (suggestedStyle && !health.training_style) {
      updateHealth({ training_style: suggestedStyle });
    }
  }, [suggestedStyle, health.training_style, updateHealth]);

  function toggleGoal(goal: PhysicalGoal) {
    const selected = health.physical_goals.includes(goal);
    const updated = selected
      ? health.physical_goals.filter((item) => item !== goal)
      : [...health.physical_goals, goal];

    updateHealth({ physical_goals: updated });
  }

  function toggleMuscle(muscle: PriorityMuscle) {
    const selected = health.priority_muscles.includes(muscle);
    updateHealth({
      priority_muscles: selected
        ? health.priority_muscles.filter((item) => item !== muscle)
        : [...health.priority_muscles, muscle],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-bold text-white/80">{t("goalsLabel")}</p>
        <div className="grid gap-2 md:grid-cols-2">
            {goals.map((goal) => {
            const selected = health.physical_goals.includes(goal);
            return (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoal(goal)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  selected
                    ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                    : "border-white/15 bg-white/5 text-white/70"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                    selected ? "border-[#a6ff00] bg-[#a6ff00] text-black" : "border-white/30 text-transparent"
                  }`}
                >
                  {selected ? "∓" : ""}
                </span>
                {t(`options.${goal}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("styleLabel")}</p>
        <div className="grid gap-2">
          {styles.map((style) => {
            const isSuggested = suggestedStyle === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => updateHealth({ training_style: style })}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  health.training_style === style
                    ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                    : "border-white/15 bg-white/5 text-white/70"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                    health.training_style === style
                      ? "border-[#a6ff00] bg-[#a6ff00] text-black"
                      : "border-white/30 text-transparent"
                  }`}
                >
                  {health.training_style === style ? "∓" : ""}
                </span>
                <div>
                  <span className="block">{t(`styles.${style}.label`)}</span>
                  <span className="mt-0.5 block text-xs opacity-70">{t(`styles.${style}.description`)}</span>
                </div>
                {isSuggested ? (
                  <span className="ml-auto shrink-0 text-xs font-black text-[#a6ff00]">
                    {t("suggested")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("musclesLabel")}</p>
        <p className="mb-3 text-xs text-white/50">{t("musclesHint")}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {muscles.map((muscle) => {
            const selected = health.priority_muscles.includes(muscle);
            return (
              <button
                key={muscle}
                type="button"
                onClick={() => toggleMuscle(muscle)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selected
                  ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                  : "border-white/15 bg-white/5 text-white/70"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded border text-[10px] font-black ${selected ? "border-[#a6ff00] bg-[#a6ff00] text-black" : "border-white/30 text-transparent"}`}
                >
                  {selected ? "✓" : ""}
                </span>
                {t(`muscles.${muscle}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("intensityLabel")}</p>
        <div className="grid gap-2">
          {intensities.map((intensity) => (
            <button
              key={intensity}
              type="button"
              onClick={() => updateHealth({ intensity_preference: intensity })}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                health.intensity_preference === intensity
                  ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                  health.intensity_preference === intensity
                    ? "border-[#a6ff00] bg-[#a6ff00] text-black"
                    : "border-white/30 text-transparent"
                }`}
              >
                {health.intensity_preference === intensity ? "⊓" : ""}
              </span>
              {t(`intensity.${intensity}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <label className="flex flex-col gap-2 text-sm font-semibold text-white">
          {t("specificGoal")}
          <textarea
            value={health.specific_goal}
            onChange={(event) => updateHealth({ specific_goal: event.target.value })}
            className="min-h-28 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#a6ff00]"
            placeholder={t("specificGoalPlaceholder")}
          />
        </label>
      </div>
    </div>
  );
}

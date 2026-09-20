import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { INTENSITY_PREFERENCES, PHYSICAL_GOALS, PRIORITY_MUSCLES, TRAINING_STYLES } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { PhysicalGoal, PriorityMuscle, TrainingStyle } from "@/types/onboarding";

import { OptionChip, StepSection, TextField } from "../OnboardingUi";

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
    updateHealth({
      physical_goals: selected
        ? health.physical_goals.filter((item) => item !== goal)
        : [...health.physical_goals, goal],
    });
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
    <div className="flex flex-col gap-7">
      <StepSection title={t("goalsLabel")}>
        <div className="flex flex-wrap gap-2.5">
          {goals.map((goal) => (
            <OptionChip
              key={goal}
              showCheck
              selected={health.physical_goals.includes(goal)}
              onClick={() => toggleGoal(goal)}
            >
              {t(`options.${goal}`)}
            </OptionChip>
          ))}
        </div>
      </StepSection>

      <StepSection title={t("styleLabel")}>
        <div className="flex flex-wrap gap-2.5">
          {styles.map((style) => (
            <OptionChip
              key={style}
              selected={health.training_style === style}
              onClick={() => updateHealth({ training_style: style })}
            >
              {t(`styles.${style}.label`)}
              {suggestedStyle === style ? ` · ${t("suggested")}` : ""}
            </OptionChip>
          ))}
        </div>
      </StepSection>

      <StepSection title={t("musclesLabel")} hint={t("musclesHint")}>
        <div className="flex flex-wrap gap-2.5">
          {muscles.map((muscle) => (
            <OptionChip
              key={muscle}
              showCheck
              selected={health.priority_muscles.includes(muscle)}
              onClick={() => toggleMuscle(muscle)}
            >
              {t(`muscles.${muscle}`)}
            </OptionChip>
          ))}
        </div>
      </StepSection>

      <StepSection title={t("intensityLabel")}>
        <div className="grid grid-cols-3 gap-2">
          {intensities.map((intensity) => (
            <OptionChip
              key={intensity}
              tall
              selected={health.intensity_preference === intensity}
              onClick={() => updateHealth({ intensity_preference: intensity })}
            >
              {t(`intensity.${intensity}`)}
            </OptionChip>
          ))}
        </div>
      </StepSection>

      <StepSection title={t("specificGoal")}>
        <TextField
          id="specific-goal"
          label={t("specificGoal")}
          hideLabel
          multiline
          value={health.specific_goal}
          onChange={(value) => updateHealth({ specific_goal: value })}
          placeholder={t("specificGoalPlaceholder")}
        />
      </StepSection>
    </div>
  );
}

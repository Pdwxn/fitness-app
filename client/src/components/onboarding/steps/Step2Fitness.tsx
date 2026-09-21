import { useTranslations } from "next-intl";

import { ACTIVITY_LEVELS, EXPERIENCE_LEVELS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";

import { OptionCard, OptionChip, StepSection } from "../OnboardingUi";

const experienceOptions = [...EXPERIENCE_LEVELS];
const activityOptions = [...ACTIVITY_LEVELS];

export function Step2Fitness() {
  const t = useTranslations("Onboarding.form.fitness");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  return (
    <div className="flex flex-col gap-7">
      <StepSection title={t("experienceLabel")}>
        <div className="flex flex-col gap-3">
          {experienceOptions.map((option) => (
            <OptionCard
              key={option}
              selected={health.experience_level === option}
              onClick={() => updateHealth({ experience_level: option })}
              title={t(`experience.${option}.label`)}
              description={t(`experience.${option}.description`)}
            />
          ))}
        </div>
      </StepSection>

      <StepSection title={t("activityLabel")}>
        <div className="flex flex-wrap gap-2.5">
          {activityOptions.map((option) => (
            <OptionChip
              key={option}
              selected={health.activity_level === option}
              onClick={() => updateHealth({ activity_level: option })}
            >
              {t(`activity.${option}.label`)}
            </OptionChip>
          ))}
        </div>
      </StepSection>
    </div>
  );
}

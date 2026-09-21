import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { DAYS_PER_WEEK, RECOMMENDED_ROUTINE_MAP, ROUTINE_TYPES, SESSION_DURATIONS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";

import { OptionCard, OptionChip, StepSection } from "../OnboardingUi";

const days = [...DAYS_PER_WEEK];
const durations = [...SESSION_DURATIONS];
const routines = [...ROUTINE_TYPES];

export function Step6Schedule() {
  const t = useTranslations("Onboarding.form.schedule");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  const recommendedRoutine = useMemo(
    () => (health.days_per_week ? RECOMMENDED_ROUTINE_MAP[health.days_per_week] : null),
    [health.days_per_week],
  );

  return (
    <div className="flex flex-col gap-7">
      <StepSection title={t("daysLabel")}>
        <div className="flex flex-wrap gap-2.5">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={health.days_per_week === day}
              onClick={() => updateHealth({ days_per_week: day })}
              className={`grid size-12 place-items-center rounded-full text-lg font-extrabold transition-colors ${
                health.days_per_week === day
                  ? "border border-[#a6ff00] bg-[#a6ff00] text-black"
                  : "border border-white/[0.22] text-white"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </StepSection>

      <StepSection title={t("durationLabel")}>
        <div className="flex flex-wrap gap-2.5">
          {durations.map((duration) => (
            <OptionChip
              key={duration}
              selected={health.session_duration_minutes === duration}
              onClick={() => updateHealth({ session_duration_minutes: duration })}
            >
              {t("minutes", { count: duration })}
            </OptionChip>
          ))}
        </div>
      </StepSection>

      <StepSection title={t("routineLabel")}>
        <div className="grid gap-3 md:grid-cols-2">
          {routines.map((routine) => (
            <OptionCard
              key={routine}
              selected={health.routine_type === routine}
              onClick={() => updateHealth({ routine_type: routine })}
              title={t(`routines.${routine}.label`)}
              description={t(`routines.${routine}.description`)}
              detail={t(`routines.${routine}.days`)}
              badge={recommendedRoutine === routine ? t("recommended") : undefined}
            />
          ))}
        </div>
      </StepSection>
    </div>
  );
}

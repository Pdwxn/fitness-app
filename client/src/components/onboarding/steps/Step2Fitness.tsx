import { useTranslations } from "next-intl";

import { ACTIVITY_LEVELS, EXPERIENCE_LEVELS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";

const experienceOptions = [...EXPERIENCE_LEVELS];
const activityOptions = [...ACTIVITY_LEVELS];

export function Step2Fitness() {
  const t = useTranslations("Onboarding.form.fitness");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-bold text-white/80">{t("experienceLabel")}</p>
        <div className="grid gap-2">
          {experienceOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateHealth({ experience_level: option })}
              className={`rounded-3xl border p-4 text-left transition ${
                health.experience_level === option
                  ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              <span className="block text-lg font-black">{t(`experience.${option}.label`)}</span>
              <span className="mt-1 block text-sm opacity-70">{t(`experience.${option}.description`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("activityLabel")}</p>
        <div className="grid gap-2">
          {activityOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateHealth({ activity_level: option })}
              className={`rounded-3xl border p-4 text-left transition ${
                health.activity_level === option
                  ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              <span className="block text-lg font-black">{t(`activity.${option}.label`)}</span>
              <span className="mt-1 block text-sm opacity-70">{t(`activity.${option}.description`)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

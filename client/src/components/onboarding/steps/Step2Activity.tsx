import { useTranslations } from "next-intl";

import { ACTIVITY_LEVELS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";

const options = [...ACTIVITY_LEVELS];

export function Step2Activity() {
  const t = useTranslations("Onboarding.form.activity");
  const activity = useOnboardingStore((state) => state.data.health.activity_level);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => updateHealth({ activity_level: option })}
          className={`rounded-3xl border p-4 text-left transition ${
            activity === option
              ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
              : "border-white/15 bg-white/5 text-white/70"
          }`}
        >
          <span className="block text-lg font-black">{t(`options.${option}.label`)}</span>
          <span className="mt-1 block text-sm opacity-70">{t(`options.${option}.description`)}</span>
        </button>
      ))}
    </div>
  );
}

import { useTranslations } from "next-intl";

import { useOnboardingStore } from "@/store/onboardingStore";
import type { ActivityLevel } from "@/types/onboarding";

const options: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];

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
            activity === option ? "border-[#17130f] bg-[#17130f] text-white" : "border-[#ded2bf] bg-white"
          }`}
        >
          <span className="block text-lg font-black">{t(`options.${option}.label`)}</span>
          <span className="mt-1 block text-sm opacity-70">{t(`options.${option}.description`)}</span>
        </button>
      ))}
    </div>
  );
}

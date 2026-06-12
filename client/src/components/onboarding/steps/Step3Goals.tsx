import { useTranslations } from "next-intl";

import { useOnboardingStore } from "@/store/onboardingStore";
import type { PhysicalGoal } from "@/types/onboarding";

const goals: PhysicalGoal[] = ["lose_weight", "gain_muscle", "endurance", "flexibility", "general_fitness"];

export function Step3Goals() {
  const t = useTranslations("Onboarding.form.goals");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  function toggleGoal(goal: PhysicalGoal) {
    const selected = health.physical_goals.includes(goal);
    updateHealth({
      physical_goals: selected
        ? health.physical_goals.filter((item) => item !== goal)
        : [...health.physical_goals, goal],
    });
  }

  return (
    <div className="flex flex-col gap-5">
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
                {selected ? "✓" : ""}
              </span>
              {t(`options.${goal}`)}
            </button>
          );
        })}
      </div>

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
  );
}

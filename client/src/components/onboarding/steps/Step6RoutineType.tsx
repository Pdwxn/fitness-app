import { useTranslations } from "next-intl";

import { ROUTINE_TYPES } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { RoutineType } from "@/types/onboarding";

const routines = [...ROUTINE_TYPES];

export function Step6RoutineType() {
  const t = useTranslations("Onboarding.form.routine");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);
  const showWarning =
    health.routine_type === "5_days" &&
    (health.equipment_type === "calisthenics" ||
      (health.equipment_type === "home" && health.available_equipment.length < 2));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3">
        {routines.map((routine) => (
          <button
            key={routine}
            type="button"
            onClick={() => updateHealth({ routine_type: routine })}
            className={`rounded-3xl border p-4 text-left transition ${
              health.routine_type === routine
                ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                : "border-white/15 bg-white/5 text-white/70"
            }`}
          >
            <span className="block text-lg font-black">{t(`options.${routine}.label`)}</span>
            <span className="mt-1 block text-sm opacity-70">{t(`options.${routine}.description`)}</span>
          </button>
        ))}
      </div>

      {showWarning ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {t("warning")}
        </p>
      ) : null}
    </div>
  );
}

import { useTranslations } from "next-intl";

import { MEDICAL_CONDITIONS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { MedicalCondition } from "@/types/onboarding";

const conditions = [...MEDICAL_CONDITIONS];

export function Step4Health() {
  const t = useTranslations("Onboarding.form.health");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  function toggleCondition(condition: MedicalCondition) {
    const selected = health.medical_conditions.includes(condition);
    updateHealth({
      medical_conditions: selected
        ? health.medical_conditions.filter((item) => item !== condition)
        : [...health.medical_conditions, condition],
    });
  }

  function updateInjury(index: number, field: "area" | "description", value: string) {
    updateHealth({
      injuries: health.injuries.map((injury, itemIndex) =>
        itemIndex === index ? { ...injury, [field]: value } : injury,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-bold text-white/80">{t("conditionsLabel")}</p>
        <p className="mb-3 text-xs text-white/50">{t("conditionsHint")}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {conditions.map((condition) => {
            const selected = health.medical_conditions.includes(condition);
            return (
              <button
                key={condition}
                type="button"
                onClick={() => toggleCondition(condition)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  selected
                    ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                    : "border-white/15 bg-white/5 text-white/70"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded border text-[10px] font-black ${
                    selected ? "border-[#a6ff00] bg-[#a6ff00] text-black" : "border-white/30 text-transparent"
                  }`}
                >
                  {selected ? "┓" : ""}
                </span>
                <div>
                  <span className="block">{t(`conditions.${condition}.label`)}</span>
                  <span className="mt-0.5 block text-xs opacity-70">{t(`conditions.${condition}.description`)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("injuriesLabel")}</p>
        <p className="mb-3 text-xs text-white/50">{t("injuriesHint")}</p>
        {health.injuries.map((injury, index) => (
          <div key={index} className="mb-3 rounded-3xl border border-white/15 bg-white/5 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={injury.area}
                onChange={(event) => updateInjury(index, "area", event.target.value)}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#a6ff00]"
                placeholder={t("areaPlaceholder")}
              />
              <input
                value={injury.description}
                onChange={(event) => updateInjury(index, "description", event.target.value)}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#a6ff00]"
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <button
              type="button"
              onClick={() => updateHealth({ injuries: health.injuries.filter((_, itemIndex) => itemIndex !== index) })}
              className="mt-3 text-sm font-bold text-[#a6ff00]"
            >
              {t("remove")}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateHealth({ injuries: [...health.injuries, { area: "", description: "" }] })}
          className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white"
        >
          {t("add")}
        </button>
      </div>
    </div>
  );
}

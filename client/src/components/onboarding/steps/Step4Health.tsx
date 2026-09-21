import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { MEDICAL_CONDITIONS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { MedicalCondition } from "@/types/onboarding";

import { OptionCard, StepSection, TextField } from "../OnboardingUi";

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
    <div className="flex flex-col gap-7">
      <StepSection title={t("conditionsLabel")} hint={t("conditionsHint")}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {conditions.map((condition) => (
            <OptionCard
              key={condition}
              compact
              selected={health.medical_conditions.includes(condition)}
              onClick={() => toggleCondition(condition)}
              title={t(`conditions.${condition}.label`)}
              description={t(`conditions.${condition}.description`)}
            />
          ))}
        </div>
      </StepSection>

      <StepSection title={t("injuriesLabel")} hint={t("injuriesHint")}>
        <div className="flex flex-col gap-3">
          {health.injuries.map((injury, index) => (
            <div key={index} className="flex flex-col gap-3.5 border-t border-white/[0.13] pt-4">
              <div className="flex min-h-11 items-center justify-between">
                <p className="text-base font-bold text-white/60">{t("injuryNumber", { number: index + 1 })}</p>
                <button
                  type="button"
                  onClick={() =>
                    updateHealth({ injuries: health.injuries.filter((_, itemIndex) => itemIndex !== index) })
                  }
                  aria-label={t("removeAria", { number: index + 1 })}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-white/[0.22] px-3.5 text-[15px] font-semibold"
                >
                  <Trash2 aria-hidden="true" size={20} strokeWidth={1.5} />
                  {t("remove")}
                </button>
              </div>
              <TextField
                id={`injury-area-${index}`}
                label={t("area")}
                value={injury.area}
                onChange={(value) => updateInjury(index, "area", value)}
                placeholder={t("areaPlaceholder")}
              />
              <TextField
                id={`injury-description-${index}`}
                label={t("description")}
                value={injury.description}
                onChange={(value) => updateInjury(index, "description", value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateHealth({ injuries: [...health.injuries, { area: "", description: "" }] })}
            className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-[28px] border-[1.5px] border-white/30 text-[17px] font-bold"
          >
            <Plus aria-hidden="true" size={22} strokeWidth={1.8} />
            {t("add")}
          </button>
        </div>
      </StepSection>
    </div>
  );
}

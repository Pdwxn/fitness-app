import { useTranslations } from "next-intl";
import { Dumbbell, Home, PersonStanding, type LucideIcon } from "lucide-react";

import { EQUIPMENT_TYPES, HOME_EQUIPMENT } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { EquipmentType, HomeEquipment } from "@/types/onboarding";

import { OptionCard, OptionChip, StepSection } from "../OnboardingUi";

const equipmentTypes: EquipmentType[] = [...EQUIPMENT_TYPES];
const homeEquipment: HomeEquipment[] = [...HOME_EQUIPMENT];

const TYPE_ICONS: Record<EquipmentType, LucideIcon> = {
  gym: Dumbbell,
  home: Home,
  calisthenics: PersonStanding,
};

export function Step5Equipment() {
  const t = useTranslations("Onboarding.form.equipment");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  function toggleEquipment(item: HomeEquipment) {
    const selected = health.available_equipment.includes(item);
    updateHealth({
      available_equipment: selected
        ? health.available_equipment.filter((value) => value !== item)
        : [...health.available_equipment, item],
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <StepSection title={t("typeLabel")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {equipmentTypes.map((option) => (
            <OptionCard
              key={option}
              icon={TYPE_ICONS[option]}
              selected={health.equipment_type === option}
              onClick={() =>
                updateHealth({
                  equipment_type: option,
                  available_equipment: option === "home" ? health.available_equipment : [],
                })
              }
              title={t(`types.${option}.label`)}
              description={t(`types.${option}.description`)}
            />
          ))}
        </div>
      </StepSection>

      {health.equipment_type === "home" ? (
        <StepSection title={t("availableLabel")}>
          <div className="flex flex-wrap gap-2.5">
            {homeEquipment.map((item) => (
              <OptionChip
                key={item}
                showCheck
                selected={health.available_equipment.includes(item)}
                onClick={() => toggleEquipment(item)}
              >
                {t(`home.${item}`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
      ) : null}
    </div>
  );
}

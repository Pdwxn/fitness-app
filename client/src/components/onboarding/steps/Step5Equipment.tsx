import { useTranslations } from "next-intl";

import { EQUIPMENT_TYPES, HOME_EQUIPMENT } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { EquipmentType, HomeEquipment } from "@/types/onboarding";

const equipmentTypes: EquipmentType[] = [...EQUIPMENT_TYPES];
const homeEquipment: HomeEquipment[] = [...HOME_EQUIPMENT];

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
    <div className="flex flex-col gap-5">
      <div className="grid gap-3">
        {equipmentTypes.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() =>
              updateHealth({
                equipment_type: option,
                available_equipment: option === "home" ? health.available_equipment : [],
              })
            }
            className={`rounded-3xl border p-4 text-left transition ${
              health.equipment_type === option
                ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                : "border-white/15 bg-white/5 text-white/70"
            }`}
          >
            <span className="block text-lg font-black">{t(`types.${option}.label`)}</span>
            <span className="mt-1 block text-sm opacity-70">{t(`types.${option}.description`)}</span>
          </button>
        ))}
      </div>

      {health.equipment_type === "home" ? (
        <div className="grid gap-2 md:grid-cols-2">
          {homeEquipment.map((item) => {
            const selected = health.available_equipment.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
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
                {t(`home.${item}`)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

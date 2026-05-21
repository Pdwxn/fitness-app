import { useTranslations } from "next-intl";

import { useOnboardingStore } from "@/store/onboardingStore";
import type { EquipmentType, HomeEquipment } from "@/types/onboarding";

const equipmentTypes: EquipmentType[] = ["gym", "home", "calisthenics"];
const homeEquipment: HomeEquipment[] = [
  "dumbbells",
  "pull_up_bar",
  "bands",
  "kettlebell",
  "bench",
  "trx",
  "bodyweight_only",
];

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
                ? "border-[#17130f] bg-[#17130f] text-white"
                : "border-[#ded2bf] bg-white"
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
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                  selected ? "border-[#8b5e34] bg-[#f7f3ec] text-[#8b5e34]" : "border-[#ded2bf] bg-white"
                }`}
              >
                {t(`home.${item}`)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

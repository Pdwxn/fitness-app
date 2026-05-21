import { useOnboardingStore } from "@/store/onboardingStore";
import type { EquipmentType, HomeEquipment } from "@/types/onboarding";

const equipmentTypes: Array<{ value: EquipmentType; label: string; description: string }> = [
  { value: "gym", label: "Gimnasio", description: "Máquinas, barras, mancuernas y cables" },
  { value: "home", label: "Casa", description: "Equipo limitado o entrenamiento en casa" },
  { value: "calisthenics", label: "Calistenia", description: "Peso corporal, dominadas y paralelas" },
];

const homeEquipment: Array<{ value: HomeEquipment; label: string }> = [
  { value: "dumbbells", label: "Mancuernas" },
  { value: "pull_up_bar", label: "Barra de dominadas" },
  { value: "bands", label: "Bandas" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bench", label: "Banco" },
  { value: "trx", label: "TRX" },
  { value: "bodyweight_only", label: "Solo peso corporal" },
];

export function Step5Equipment() {
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
            key={option.value}
            type="button"
            onClick={() =>
              updateHealth({
                equipment_type: option.value,
                available_equipment: option.value === "home" ? health.available_equipment : [],
              })
            }
            className={`rounded-3xl border p-4 text-left transition ${
              health.equipment_type === option.value
                ? "border-[#17130f] bg-[#17130f] text-white"
                : "border-[#ded2bf] bg-white"
            }`}
          >
            <span className="block text-lg font-black">{option.label}</span>
            <span className="mt-1 block text-sm opacity-70">{option.description}</span>
          </button>
        ))}
      </div>

      {health.equipment_type === "home" ? (
        <div className="grid gap-2 md:grid-cols-2">
          {homeEquipment.map((item) => {
            const selected = health.available_equipment.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggleEquipment(item.value)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                  selected ? "border-[#8b5e34] bg-[#f7f3ec] text-[#8b5e34]" : "border-[#ded2bf] bg-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

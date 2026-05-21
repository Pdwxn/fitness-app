import { useOnboardingStore } from "@/store/onboardingStore";
import type { ActivityLevel } from "@/types/onboarding";

const options: Array<{ value: ActivityLevel; label: string; description: string }> = [
  { value: "sedentary", label: "Sedentario", description: "Sin ejercicio regular" },
  { value: "light", label: "Ligero", description: "1-2 días por semana" },
  { value: "moderate", label: "Moderado", description: "3-4 días por semana" },
  { value: "active", label: "Activo", description: "5 días por semana" },
  { value: "very_active", label: "Muy activo", description: "6-7 días por semana" },
];

export function Step2Activity() {
  const activity = useOnboardingStore((state) => state.data.health.activity_level);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => updateHealth({ activity_level: option.value })}
          className={`rounded-3xl border p-4 text-left transition ${
            activity === option.value ? "border-[#17130f] bg-[#17130f] text-white" : "border-[#ded2bf] bg-white"
          }`}
        >
          <span className="block text-lg font-black">{option.label}</span>
          <span className="mt-1 block text-sm opacity-70">{option.description}</span>
        </button>
      ))}
    </div>
  );
}

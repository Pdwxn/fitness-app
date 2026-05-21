import { useOnboardingStore } from "@/store/onboardingStore";
import type { RoutineType } from "@/types/onboarding";

const routines: Array<{ value: RoutineType; label: string; description: string }> = [
  { value: "push_pull_legs", label: "Push / Pull / Legs", description: "Empuje, jalón y piernas" },
  { value: "upper_lower", label: "Torso / Pierna", description: "Alterna tren superior e inferior" },
  { value: "hybrid", label: "Híbrido", description: "Flexible para 3-5 días" },
  { value: "5_days", label: "5 días", description: "Un grupo muscular por día" },
];

export function Step6RoutineType() {
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
            key={routine.value}
            type="button"
            onClick={() => updateHealth({ routine_type: routine.value })}
            className={`rounded-3xl border p-4 text-left transition ${
              health.routine_type === routine.value
                ? "border-[#17130f] bg-[#17130f] text-white"
                : "border-[#ded2bf] bg-white"
            }`}
          >
            <span className="block text-lg font-black">{routine.label}</span>
            <span className="mt-1 block text-sm opacity-70">{routine.description}</span>
          </button>
        ))}
      </div>

      {showWarning ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Con tu equipamiento actual, una rutina de 5 días puede ser difícil de completar.
        </p>
      ) : null}
    </div>
  );
}

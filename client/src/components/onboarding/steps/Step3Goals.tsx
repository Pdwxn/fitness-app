import { useOnboardingStore } from "@/store/onboardingStore";
import type { PhysicalGoal } from "@/types/onboarding";

const goals: Array<{ value: PhysicalGoal; label: string }> = [
  { value: "lose_weight", label: "Perder peso" },
  { value: "gain_muscle", label: "Ganar músculo" },
  { value: "endurance", label: "Mejorar resistencia" },
  { value: "flexibility", label: "Mejorar flexibilidad" },
  { value: "general_fitness", label: "Fitness general" },
];

export function Step3Goals() {
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
          const selected = health.physical_goals.includes(goal.value);
          return (
            <button
              key={goal.value}
              type="button"
              onClick={() => toggleGoal(goal.value)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                selected ? "border-[#17130f] bg-[#17130f] text-white" : "border-[#ded2bf] bg-white"
              }`}
            >
              {goal.label}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-2 text-sm font-semibold">
        Meta específica opcional
        <textarea
          value={health.specific_goal}
          onChange={(event) => updateHealth({ specific_goal: event.target.value })}
          className="min-h-28 rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
          placeholder="Ej: Quiero desarrollar glúteos y hombros"
        />
      </label>
    </div>
  );
}

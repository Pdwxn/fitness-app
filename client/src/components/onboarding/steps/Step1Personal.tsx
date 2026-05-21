import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/units";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Gender, UnitSystem } from "@/types/onboarding";

const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: "male", label: "Hombre" },
  { value: "female", label: "Mujer" },
  { value: "prefer_not_to_say", label: "Prefiero no decir" },
];

export function Step1Personal() {
  const profile = useOnboardingStore((state) => state.data.profile);
  const updateProfile = useOnboardingStore((state) => state.updateProfile);
  const units = profile.preferred_units;
  const weightKg = profile.weight_kg ?? 70;
  const heightCm = profile.height_cm ?? 170;
  const height = cmToFeetInches(heightCm);

  function setUnits(nextUnits: UnitSystem) {
    updateProfile({ preferred_units: nextUnits });
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Nombre completo
        <input
          value={profile.full_name}
          onChange={(event) => updateProfile({ full_name: event.target.value })}
          className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
          placeholder="Ej: Ana Pérez"
        />
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Género</p>
        <div className="grid gap-2 md:grid-cols-3">
          {genderOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateProfile({ gender: option.value })}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                profile.gender === option.value
                  ? "border-[#17130f] bg-[#17130f] text-white"
                  : "border-[#ded2bf] bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Edad
          <input
            type="number"
            value={profile.age ?? ""}
            onChange={(event) => updateProfile({ age: Number(event.target.value) || null })}
            className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold">
          {units === "metric" ? "Peso (kg)" : "Peso (lb)"}
          <input
            type="number"
            value={units === "metric" ? weightKg : kgToLb(weightKg)}
            onChange={(event) => {
              const value = Number(event.target.value);
              updateProfile({ weight_kg: units === "metric" ? value : lbToKg(value) });
            }}
            className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm font-semibold">
          <span>{units === "metric" ? "Altura (cm)" : "Altura (ft/in)"}</span>
          {units === "metric" ? (
            <input
              type="number"
              value={heightCm}
              onChange={(event) => updateProfile({ height_cm: Number(event.target.value) || null })}
              className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={height.feet}
                onChange={(event) =>
                  updateProfile({ height_cm: feetInchesToCm(Number(event.target.value), height.inches) })
                }
                className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
              />
              <input
                type="number"
                value={height.inches}
                onChange={(event) =>
                  updateProfile({ height_cm: feetInchesToCm(height.feet, Number(event.target.value)) })
                }
                className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex rounded-full border border-[#ded2bf] bg-white p-1">
        {(["metric", "imperial"] as UnitSystem[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setUnits(option)}
            className={`w-1/2 rounded-full px-4 py-2 text-sm font-bold ${
              units === option ? "bg-[#17130f] text-white" : "text-[#5c5349]"
            }`}
          >
            {option === "metric" ? "kg / cm" : "lb / ft"}
          </button>
        ))}
      </div>
    </div>
  );
}

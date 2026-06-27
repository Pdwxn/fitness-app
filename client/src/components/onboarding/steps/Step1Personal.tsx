import { useTranslations } from "next-intl";

import { GENDER_OPTIONS } from "@/lib/constants";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/units";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { UnitSystem } from "@/types/onboarding";

const genderOptions = [...GENDER_OPTIONS];

export function Step1Personal() {
  const t = useTranslations("Onboarding.form.personal");
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
      <label className="flex flex-col gap-2 text-sm font-semibold text-white">
        {t("fullName")}
        <input
          value={profile.full_name}
          onChange={(event) => updateProfile({ full_name: event.target.value })}
          className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#a6ff00]"
          placeholder={t("fullNamePlaceholder")}
        />
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-white">{t("gender")}</p>
        <div className="grid gap-2 md:grid-cols-3">
          {genderOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateProfile({ gender: option })}
              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                profile.gender === option
                  ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              {t(`genderOptions.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-semibold text-white">
          {t("age")}
          <input
            type="number"
            value={profile.age ?? ""}
            onChange={(event) => updateProfile({ age: Number(event.target.value) || null })}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-[#a6ff00]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-white">
          {units === "metric" ? t("weightKg") : t("weightLb")}
          <input
            type="number"
            value={units === "metric" ? weightKg : kgToLb(weightKg)}
            onChange={(event) => {
              const value = Number(event.target.value);
              updateProfile({ weight_kg: units === "metric" ? value : lbToKg(value) });
            }}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-[#a6ff00]"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm font-semibold text-white">
          <span>{units === "metric" ? t("heightCm") : t("heightFt")}</span>
          {units === "metric" ? (
            <input
              type="number"
              value={heightCm}
              onChange={(event) => updateProfile({ height_cm: Number(event.target.value) || null })}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-[#a6ff00]"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={height.feet}
                onChange={(event) =>
                  updateProfile({ height_cm: feetInchesToCm(Number(event.target.value), height.inches) })
                }
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-[#a6ff00]"
              />
              <input
                type="number"
                value={height.inches}
                onChange={(event) =>
                  updateProfile({ height_cm: feetInchesToCm(height.feet, Number(event.target.value)) })
                }
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-[#a6ff00]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex rounded-full border border-white/15 bg-white/5 p-1">
        {(["metric", "imperial"] as UnitSystem[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setUnits(option)}
            className={`w-1/2 rounded-full px-4 py-2 text-sm font-bold ${
              units === option ? "bg-[#a6ff00] text-black" : "text-white/60"
            }`}
          >
            {option === "metric" ? "kg / cm" : "lb / ft"}
          </button>
        ))}
      </div>
    </div>
  );
}

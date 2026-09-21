import { useTranslations } from "next-intl";

import { GENDER_OPTIONS } from "@/lib/constants";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/units";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { UnitSystem } from "@/types/onboarding";

import { OptionChip, StepSection, TextField } from "../OnboardingUi";

const genderOptions = [...GENDER_OPTIONS];

export type Step1Errors = { name: boolean; age: boolean; weight: boolean; height: boolean };

/** The same ranges `OnboardingForm` requires before letting the user leave this step. */
export function validateStep1(profile: {
  full_name: string;
  gender: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
}): Step1Errors & { gender: boolean } {
  return {
    name: !profile.full_name.trim(),
    gender: !profile.gender,
    age: !(profile.age && profile.age >= 13 && profile.age <= 100),
    weight: !(profile.weight_kg && profile.weight_kg >= 20 && profile.weight_kg <= 400),
    height: !(profile.height_cm && profile.height_cm >= 80 && profile.height_cm <= 250),
  };
}

function numberOrNull(raw: string): number | null {
  const value = Number(raw);
  return raw.trim() === "" || !Number.isFinite(value) ? null : value;
}

export function Step1Personal({ showErrors = false }: { showErrors?: boolean }) {
  const t = useTranslations("Onboarding.form.personal");
  const profile = useOnboardingStore((state) => state.data.profile);
  const updateProfile = useOnboardingStore((state) => state.updateProfile);
  const units = profile.preferred_units;
  const errors = validateStep1(profile);
  const height = profile.height_cm != null ? cmToFeetInches(profile.height_cm) : null;

  const shown = (flag: boolean, message: string) => (showErrors && flag ? message : null);

  return (
    <div className="flex flex-col gap-6">
      <TextField
        id="full-name"
        label={t("fullName")}
        value={profile.full_name}
        onChange={(value) => updateProfile({ full_name: value })}
        placeholder={t("fullNamePlaceholder")}
        error={shown(errors.name, t("errors.name"))}
      />

      <StepSection title={t("gender")}>
        <div className="grid grid-cols-3 gap-2">
          {genderOptions.map((option) => (
            <OptionChip
              key={option}
              tall
              selected={profile.gender === option}
              onClick={() => updateProfile({ gender: option })}
            >
              {t(`genderOptions.${option}`)}
            </OptionChip>
          ))}
        </div>
        {showErrors && errors.gender ? (
          <p role="alert" className="text-[15px] font-semibold text-red-300">
            {t("errors.gender")}
          </p>
        ) : null}
      </StepSection>

      <TextField
        id="age"
        label={t("age")}
        type="number"
        inputMode="numeric"
        value={profile.age ?? ""}
        onChange={(value) => updateProfile({ age: numberOrNull(value) })}
        placeholder={t("agePlaceholder")}
        suffix={t("ageUnit")}
        error={shown(errors.age, t("errors.age"))}
      />

      <StepSection title={t("units")}>
        <div className="grid grid-cols-2 gap-2">
          {(["metric", "imperial"] as UnitSystem[]).map((option) => (
            <OptionChip
              key={option}
              tall
              selected={units === option}
              onClick={() => updateProfile({ preferred_units: option })}
            >
              {t(`unitOptions.${option}`)}
            </OptionChip>
          ))}
        </div>
      </StepSection>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="weight"
          label={t("weight")}
          type="number"
          inputMode="decimal"
          value={profile.weight_kg == null ? "" : units === "metric" ? profile.weight_kg : kgToLb(profile.weight_kg)}
          onChange={(value) => {
            const parsed = numberOrNull(value);
            updateProfile({ weight_kg: parsed == null ? null : units === "metric" ? parsed : lbToKg(parsed) });
          }}
          placeholder={t("weightPlaceholder")}
          suffix={units === "metric" ? "kg" : "lb"}
          error={shown(errors.weight, t("errors.weight"))}
        />

        {units === "metric" ? (
          <TextField
            id="height"
            label={t("height")}
            type="number"
            inputMode="numeric"
            value={profile.height_cm ?? ""}
            onChange={(value) => updateProfile({ height_cm: numberOrNull(value) })}
            placeholder={t("heightPlaceholder")}
            suffix="cm"
            error={shown(errors.height, t("errors.height"))}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="height-ft"
              label={t("heightFeet")}
              type="number"
              inputMode="numeric"
              value={height?.feet ?? ""}
              onChange={(value) =>
                updateProfile({ height_cm: feetInchesToCm(Number(value) || 0, height?.inches ?? 0) })
              }
              suffix="ft"
              error={shown(errors.height, t("errors.height"))}
            />
            <TextField
              id="height-in"
              label={t("heightInches")}
              type="number"
              inputMode="numeric"
              value={height?.inches ?? ""}
              onChange={(value) =>
                updateProfile({ height_cm: feetInchesToCm(height?.feet ?? 0, Number(value) || 0) })
              }
              suffix="in"
            />
          </div>
        )}
      </div>
    </div>
  );
}

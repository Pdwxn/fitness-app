"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ApiError, authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/units";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type {
  ActivityLevel,
  EquipmentType,
  Gender,
  HomeEquipment,
  Injury,
  OnboardingHealth,
  OnboardingProfile,
  PhysicalGoal,
  RoutineType,
  UnitSystem,
} from "@/types/onboarding";

type SettingsCache = {
  preferred_language: "es" | "en";
  preferred_units: UnitSystem;
};

type ProfileResponse = OnboardingProfile & {
  id: string;
  created_at: string;
  updated_at: string;
};

type HealthResponse = OnboardingHealth & {
  id: string;
  created_at: string;
  updated_at: string;
};

const genders: Gender[] = ["male", "female", "prefer_not_to_say"];
const activityLevels: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const goals: PhysicalGoal[] = ["lose_weight", "gain_muscle", "endurance", "flexibility", "general_fitness"];
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
const routineTypes: RoutineType[] = ["push_pull_legs", "upper_lower", "hybrid", "5_days"];

const emptyProfile = (locale: string): OnboardingProfile => ({
  full_name: "",
  gender: "",
  age: null,
  weight_kg: null,
  height_cm: null,
  preferred_language: locale === "en" ? "en" : "es",
  preferred_units: "metric",
});

const emptyHealth: OnboardingHealth = {
  activity_level: "",
  physical_goals: [],
  specific_goal: "",
  injuries: [],
  equipment_type: "",
  available_equipment: [],
  routine_type: "",
};

export function ProfileContent({ locale }: { locale: string }) {
  const t = useTranslations("Profile");
  const onboarding = useTranslations("Onboarding.form");
  const [profile, setProfile] = useState<OnboardingProfile>(emptyProfile(locale));
  const [health, setHealth] = useState<OnboardingHealth>(emptyHealth);
  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<"profile" | "health" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { routine, lastSync, isOfflineFallback } = useRoutineCache();
  const now = new Date();
  const hasCurrentMonthRoutine = Boolean(
    routine && routine.month === now.getMonth() + 1 && routine.year === now.getFullYear(),
  );
  const routineTitle = hasCurrentMonthRoutine
    ? t("routine.activeTitle")
    : routine
      ? t("routine.outdatedTitle")
      : t("routine.emptyTitle");
  const routineDescription = hasCurrentMonthRoutine
    ? t("routine.activeDescription")
    : routine
      ? t("routine.outdatedDescription")
      : t("routine.emptyDescription");

  const units = profile.preferred_units;
  const weightKg = profile.weight_kg ?? 70;
  const heightCm = profile.height_cm ?? 170;
  const height = cmToFeetInches(heightCm);

  useEffect(() => {
    let cancelled = false;
    const cachedProfile = getFromStorage<OnboardingProfile>(STORAGE_KEYS.PROFILE);
    const cachedHealth = getFromStorage<OnboardingHealth>(STORAGE_KEYS.HEALTH_PROFILE);
    const cachedSettings = getFromStorage<SettingsCache>(STORAGE_KEYS.SETTINGS);
    const pendingSync = getFromStorage<unknown[]>(STORAGE_KEYS.PENDING_SYNC);

    if (cachedProfile) setProfile(cachedProfile);
    if (!cachedProfile && cachedSettings) {
      setProfile((current) => ({ ...current, ...cachedSettings }));
    }
    if (cachedHealth) setHealth(cachedHealth);
    setPendingSyncCount(pendingSync?.length ?? 0);
    if (cachedProfile || cachedHealth) setIsLoading(false);

    Promise.all([
      authenticatedClientFetch<ProfileResponse>("/api/v1/profile/"),
      authenticatedClientFetch<HealthResponse>("/api/v1/profile/health/"),
    ])
      .then(([profileResponse, healthResponse]) => {
        if (cancelled) return;
        setProfile(profileResponse);
        setHealth(healthResponse);
        setInStorage(STORAGE_KEYS.PROFILE, profileResponse);
        setInStorage(STORAGE_KEYS.HEALTH_PROFILE, healthResponse);
        setError(null);
      })
      .catch(() => {
        if (cancelled || cachedProfile || cachedHealth) return;
        setError(t("states.loadError"));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  function updateProfile(value: Partial<OnboardingProfile>) {
    setProfile((current) => ({ ...current, ...value }));
    setMessage(null);
    setError(null);
  }

  function updateHealth(value: Partial<OnboardingHealth>) {
    setHealth((current) => ({ ...current, ...value }));
    setMessage(null);
    setError(null);
  }

  function toggleGoal(goal: PhysicalGoal) {
    updateHealth({
      physical_goals: health.physical_goals.includes(goal)
        ? health.physical_goals.filter((item) => item !== goal)
        : [...health.physical_goals, goal],
    });
  }

  function toggleEquipment(item: HomeEquipment) {
    updateHealth({
      available_equipment: health.available_equipment.includes(item)
        ? health.available_equipment.filter((value) => value !== item)
        : [...health.available_equipment, item],
    });
  }

  function updateInjury(index: number, field: keyof Injury, value: string) {
    updateHealth({
      injuries: health.injuries.map((injury, itemIndex) =>
        itemIndex === index ? { ...injury, [field]: value } : injury,
      ),
    });
  }

  async function saveProfile() {
    setSavingSection("profile");
    setMessage(null);
    setError(null);
    try {
      const response = await authenticatedClientFetch<ProfileResponse>("/api/v1/profile/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setProfile(response);
      setInStorage(STORAGE_KEYS.PROFILE, response);
      setInStorage(STORAGE_KEYS.SETTINGS, {
        preferred_language: response.preferred_language,
        preferred_units: response.preferred_units,
      });
      setMessage(t("states.savedProfile"));
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.detail : t("states.saveError"));
    } finally {
      setSavingSection(null);
    }
  }

  async function saveHealth() {
    setSavingSection("health");
    setMessage(null);
    setError(null);
    const payload = {
      ...health,
      available_equipment: health.equipment_type === "home" ? health.available_equipment : [],
    };

    try {
      const response = await authenticatedClientFetch<HealthResponse>("/api/v1/profile/health/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setHealth(response);
      setInStorage(STORAGE_KEYS.HEALTH_PROFILE, response);
      setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, { completed: true });
      setMessage(t("states.savedHealth"));
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.detail : t("states.saveError"));
    } finally {
      setSavingSection(null);
    }
  }

  if (isLoading) {
    return <StateCard title={t("states.loading")} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      <section className="overflow-hidden rounded-[2rem] border border-[#ded2bf] bg-[#17130f] text-white shadow-xl">
        <div className="p-5 md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">{t("routine.eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-black">{routineTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{routineDescription}</p>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 text-sm md:grid-cols-4">
          <Metric label={t("routine.month")} value={routine ? formatRoutineMonth(routine.month, routine.year, locale) : t("routine.notAvailable")} />
          <Metric
            label={t("routine.status")}
            value={hasCurrentMonthRoutine ? t("routine.active") : routine ? t("routine.outdated") : t("routine.missing")}
          />
          <Metric label={t("routine.weeks")} value={routine ? String(routine.weeks.length) : "0"} />
          <Metric label={t("routine.lastSync")} value={formatTimestamp(lastSync, locale, t("routine.never"))} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#ded2bf] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">{t("personal.eyebrow")}</p>
          <h2 className="text-2xl font-black text-[#17130f]">{t("personal.title")}</h2>
          <p className="text-sm text-[#5c5349]">{t("personal.description")}</p>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            {onboarding("personal.fullName")}
            <input
              value={profile.full_name}
              onChange={(event) => updateProfile({ full_name: event.target.value })}
              className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
              placeholder={onboarding("personal.fullNamePlaceholder")}
            />
          </label>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{onboarding("personal.gender")}</p>
            <div className="grid gap-2 md:grid-cols-3">
              {genders.map((option) => (
                <ChoiceButton
                  key={option}
                  selected={profile.gender === option}
                  onClick={() => updateProfile({ gender: option })}
                >
                  {onboarding(`personal.genderOptions.${option}`)}
                </ChoiceButton>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label={onboarding("personal.age")} value={profile.age} onChange={(age) => updateProfile({ age })} />
            <NumberField
              label={units === "metric" ? onboarding("personal.weightKg") : onboarding("personal.weightLb")}
              value={units === "metric" ? weightKg : kgToLb(weightKg)}
              onChange={(value) => updateProfile({ weight_kg: units === "metric" ? value : lbToKg(value ?? 0) })}
            />
            {units === "metric" ? (
              <NumberField
                label={onboarding("personal.heightCm")}
                value={heightCm}
                onChange={(value) => updateProfile({ height_cm: value })}
              />
            ) : (
              <div className="flex flex-col gap-2 text-sm font-semibold">
                <span>{onboarding("personal.heightFt")}</span>
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
              </div>
            )}
          </div>

          <div className="flex rounded-full border border-[#ded2bf] bg-white p-1">
            {(["metric", "imperial"] as UnitSystem[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateProfile({ preferred_units: option })}
                className={`w-1/2 rounded-full px-4 py-2 text-sm font-bold ${
                  units === option ? "bg-[#17130f] text-white" : "text-[#5c5349]"
                }`}
              >
                {option === "metric" ? "kg / cm" : "lb / ft"}
              </button>
            ))}
          </div>

          <SaveButton disabled={savingSection !== null} loading={savingSection === "profile"} onClick={saveProfile}>
            {t("actions.savePersonal")}
          </SaveButton>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#ded2bf] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">{t("fitness.eyebrow")}</p>
          <h2 className="text-2xl font-black text-[#17130f]">{t("fitness.title")}</h2>
          <p className="text-sm text-[#5c5349]">{t("fitness.description")}</p>
        </div>

        <div className="mt-5 flex flex-col gap-6">
          <OptionGroup title={t("fitness.activity")}> 
            {activityLevels.map((option) => (
              <ChoiceButton key={option} selected={health.activity_level === option} onClick={() => updateHealth({ activity_level: option })}>
                <span className="block font-black">{onboarding(`activity.options.${option}.label`)}</span>
                <span className="block text-sm opacity-70">{onboarding(`activity.options.${option}.description`)}</span>
              </ChoiceButton>
            ))}
          </OptionGroup>

          <OptionGroup title={t("fitness.goals")} columns>
            {goals.map((goal) => (
              <ChoiceButton key={goal} selected={health.physical_goals.includes(goal)} onClick={() => toggleGoal(goal)}>
                {onboarding(`goals.options.${goal}`)}
              </ChoiceButton>
            ))}
          </OptionGroup>

          <label className="flex flex-col gap-2 text-sm font-semibold">
            {onboarding("goals.specificGoal")}
            <textarea
              value={health.specific_goal}
              onChange={(event) => updateHealth({ specific_goal: event.target.value })}
              className="min-h-28 rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
              placeholder={onboarding("goals.specificGoalPlaceholder")}
            />
          </label>

          <OptionGroup title={t("fitness.equipment")}> 
            {equipmentTypes.map((option) => (
              <ChoiceButton
                key={option}
                selected={health.equipment_type === option}
                onClick={() =>
                  updateHealth({
                    equipment_type: option,
                    available_equipment: option === "home" ? health.available_equipment : [],
                  })
                }
              >
                <span className="block font-black">{onboarding(`equipment.types.${option}.label`)}</span>
                <span className="block text-sm opacity-70">{onboarding(`equipment.types.${option}.description`)}</span>
              </ChoiceButton>
            ))}
          </OptionGroup>

          {health.equipment_type === "home" ? (
            <OptionGroup title={t("fitness.homeEquipment")} columns>
              {homeEquipment.map((item) => (
                <ChoiceButton key={item} selected={health.available_equipment.includes(item)} onClick={() => toggleEquipment(item)}>
                  {onboarding(`equipment.home.${item}`)}
                </ChoiceButton>
              ))}
            </OptionGroup>
          ) : null}

          <OptionGroup title={t("fitness.routine")}> 
            {routineTypes.map((routine) => (
              <ChoiceButton key={routine} selected={health.routine_type === routine} onClick={() => updateHealth({ routine_type: routine })}>
                <span className="block font-black">{onboarding(`routine.options.${routine}.label`)}</span>
                <span className="block text-sm opacity-70">{onboarding(`routine.options.${routine}.description`)}</span>
              </ChoiceButton>
            ))}
          </OptionGroup>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{t("fitness.injuries")}</p>
            {health.injuries.map((injury, index) => (
              <div key={index} className="rounded-3xl border border-[#ded2bf] bg-[#fbf8f2] p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={injury.area}
                    onChange={(event) => updateInjury(index, "area", event.target.value)}
                    className="rounded-2xl border border-[#ded2bf] px-4 py-3 outline-none focus:border-[#8b5e34]"
                    placeholder={onboarding("health.areaPlaceholder")}
                  />
                  <input
                    value={injury.description}
                    onChange={(event) => updateInjury(index, "description", event.target.value)}
                    className="rounded-2xl border border-[#ded2bf] px-4 py-3 outline-none focus:border-[#8b5e34]"
                    placeholder={onboarding("health.descriptionPlaceholder")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateHealth({ injuries: health.injuries.filter((_, itemIndex) => itemIndex !== index) })}
                  className="mt-3 text-sm font-bold text-[#8b5e34]"
                >
                  {onboarding("health.remove")}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateHealth({ injuries: [...health.injuries, { area: "", description: "" }] })}
              className="rounded-full border border-[#17130f] px-5 py-3 text-sm font-bold"
            >
              {onboarding("health.add")}
            </button>
          </div>

          <SaveButton disabled={savingSection !== null} loading={savingSection === "health"} onClick={saveHealth}>
            {t("actions.saveFitness")}
          </SaveButton>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#ded2bf] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">{t("settings.eyebrow")}</p>
          <h2 className="text-2xl font-black text-[#17130f]">{t("settings.title")}</h2>
          <p className="text-sm text-[#5c5349]">{t("settings.description")}</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <InfoTile label={t("settings.language")} value={profile.preferred_language === "en" ? "English" : "Español"} />
          <InfoTile label={t("settings.units")} value={profile.preferred_units === "metric" ? "kg / cm" : "lb / ft"} />
          <InfoTile label={t("settings.syncStatus")} value={isOfflineFallback ? t("settings.offlineFallback") : t("settings.onlineCache")} />
          <InfoTile label={t("settings.pendingSync")} value={String(pendingSyncCount)} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t("settings.language")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(["es", "en"] as const).map((language) => (
                <ChoiceButton
                  key={language}
                  selected={profile.preferred_language === language}
                  onClick={() => updateProfile({ preferred_language: language })}
                >
                  {language === "es" ? "Español" : "English"}
                </ChoiceButton>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t("settings.units")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(["metric", "imperial"] as UnitSystem[]).map((option) => (
                <ChoiceButton
                  key={option}
                  selected={profile.preferred_units === option}
                  onClick={() => updateProfile({ preferred_units: option })}
                >
                  {option === "metric" ? "kg / cm" : "lb / ft"}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-[#5c5349]">{t("settings.saveHint")}</p>
      </section>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-t border-white/10 p-4 md:border-t-0 md:border-r md:border-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-3xl border border-[#ded2bf] bg-[#fbf8f2] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b5e34]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#17130f]">{value}</p>
    </div>
  );
}

function formatRoutineMonth(month: number, year: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatTimestamp(value: number | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: Readonly<{
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
        selected ? "border-[#17130f] bg-[#17130f] text-white" : "border-[#ded2bf] bg-white text-[#17130f]"
      }`}
    >
      {children}
    </button>
  );
}

function OptionGroup({
  title,
  columns = false,
  children,
}: Readonly<{
  title: string;
  columns?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className={`grid gap-2 ${columns ? "md:grid-cols-2" : ""}`}>{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      <input
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="rounded-2xl border border-[#ded2bf] px-4 py-3 text-base outline-none focus:border-[#8b5e34]"
      />
    </label>
  );
}

function SaveButton({
  disabled,
  loading,
  onClick,
  children,
}: Readonly<{
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
}>) {
  const t = useTranslations("Profile.actions");
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-[#17130f] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? t("saving") : children}
    </button>
  );
}

function StateCard({ title }: { title: string }) {
  return <div className="rounded-[2rem] border border-[#ded2bf] bg-white p-6 text-sm font-bold text-[#5c5349]">{title}</div>;
}

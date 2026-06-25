"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useRoutineCache } from "@/hooks/useRoutineCache";
import { ApiError, authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { db } from "@/lib/db";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type {
  ActivityLevel,
  EquipmentType,
  Gender,
  HomeEquipment,
  OnboardingHealth,
  OnboardingProfile,
  PhysicalGoal,
  RoutineType,
  UnitSystem,
} from "@/types/onboarding";

type ProfileResponse = OnboardingProfile & { id: string; created_at: string; updated_at: string };
type HealthResponse = OnboardingHealth & { id: string; created_at: string; updated_at: string };
type SettingsCache = { preferred_language: "es" | "en"; preferred_units: UnitSystem };

const genders: Gender[] = ["male", "female", "prefer_not_to_say"];
const activityLevels: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const goals: PhysicalGoal[] = ["lose_weight", "gain_muscle", "endurance", "flexibility", "general_fitness"];
const equipmentTypes: EquipmentType[] = ["gym", "home", "calisthenics"];
const homeEquipment: HomeEquipment[] = ["dumbbells", "pull_up_bar", "bands", "kettlebell", "bench", "trx", "bodyweight_only"];
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
  const { routine, isOfflineFallback } = useRoutineCache();

  useEffect(() => {
    let cancelled = false;
    const cachedProfile = getFromStorage<OnboardingProfile>(STORAGE_KEYS.PROFILE);
    const cachedHealth = getFromStorage<OnboardingHealth>(STORAGE_KEYS.HEALTH_PROFILE);
    const cachedSettings = getFromStorage<SettingsCache>(STORAGE_KEYS.SETTINGS);
    if (cachedProfile) setProfile(cachedProfile);
    if (!cachedProfile && cachedSettings) setProfile((current) => ({ ...current, ...cachedSettings }));
    if (cachedHealth) setHealth(cachedHealth);

    db.pendingSync.count().then((count) => {
      if (!cancelled) setPendingSyncCount(count);
    });
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
        if (!cancelled) setIsLoading(false);
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
    try {
      const payload = {
        ...health,
        available_equipment: health.equipment_type === "home" ? health.available_equipment : [],
      };
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

  if (isLoading) return <StateCard title={t("states.loading")} />;

  const initials = (profile.full_name || "Apex Athlete")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5 text-white">
      {message ? <p className="rounded-2xl border border-[#a6ff00]/30 bg-[#a6ff00]/10 px-4 py-3 text-sm font-bold text-[#d7ff8a]">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</p> : null}

      <section className="apex-card relative overflow-hidden rounded-[2rem] p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full bg-[#a6ff00]/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-full border border-[#a6ff00]/50 bg-[#a6ff00]/15 text-2xl font-black text-[#a6ff00]">
            {initials}
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.26em] text-[#a6ff00]">Apex Profile</p>
            <h2 className="mt-1 text-3xl font-black">{profile.full_name || "Apex Athlete"}</h2>
            <p className="mt-1 text-sm text-white/55">{profile.preferred_language === "en" ? "English" : "Español"} · {profile.preferred_units === "metric" ? "kg / cm" : "lb / ft"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoTile label={t("routine.eyebrow")} value={routine ? `${routine.month}/${routine.year}` : t("routine.missing")} />
        <InfoTile label={t("settings.syncStatus")} value={isOfflineFallback ? t("settings.offlineFallback") : t("settings.onlineCache")} />
        <InfoTile label={t("settings.pendingSync")} value={String(pendingSyncCount)} />
      </section>

      <section className="apex-card rounded-[2rem] p-6">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">Settings</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <SelectField label={t("settings.language")} value={profile.preferred_language} onChange={(value) => updateProfile({ preferred_language: value as "es" | "en" })} options={["es", "en"]} />
          <SelectField label={t("settings.units")} value={profile.preferred_units} onChange={(value) => updateProfile({ preferred_units: value as UnitSystem })} options={["metric", "imperial"]} />
        </div>
        <button type="button" disabled={savingSection !== null} onClick={saveProfile} className="apex-button mt-5 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60">
          {savingSection === "profile" ? t("actions.saving") : t("actions.savePersonal")}
        </button>
      </section>

      <details className="apex-card rounded-[2rem] p-6">
        <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">{t("personal.title")}</summary>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <TextField label={onboarding("personal.fullName")} value={profile.full_name} onChange={(value) => updateProfile({ full_name: value })} />
          <SelectField label={onboarding("personal.gender")} value={profile.gender} onChange={(value) => updateProfile({ gender: value as Gender })} options={genders} />
          <NumberField label={onboarding("personal.age")} value={profile.age} onChange={(value) => updateProfile({ age: value })} />
          <NumberField label={onboarding("personal.weightKg")} value={profile.weight_kg} onChange={(value) => updateProfile({ weight_kg: value })} />
          <NumberField label={onboarding("personal.heightCm")} value={profile.height_cm} onChange={(value) => updateProfile({ height_cm: value })} />
        </div>
        <button type="button" disabled={savingSection !== null} onClick={saveProfile} className="apex-button mt-5 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60">
          {savingSection === "profile" ? t("actions.saving") : t("actions.savePersonal")}
        </button>
      </details>

      <details className="apex-card rounded-[2rem] p-6">
        <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">{t("fitness.title")}</summary>
        <div className="mt-5 grid gap-4">
          <SelectField label={t("fitness.activity")} value={health.activity_level} onChange={(value) => updateHealth({ activity_level: value as ActivityLevel })} options={activityLevels} />
          <ChipGroup title={t("fitness.goals")} items={goals} selected={health.physical_goals} onToggle={toggleGoal} label={(goal) => onboarding(`goals.options.${goal}`)} />
          <TextField label={onboarding("goals.specificGoal")} value={health.specific_goal} onChange={(value) => updateHealth({ specific_goal: value })} />
          <SelectField label={t("fitness.equipment")} value={health.equipment_type} onChange={(value) => updateHealth({ equipment_type: value as EquipmentType })} options={equipmentTypes} />
          {health.equipment_type === "home" ? <ChipGroup title={t("fitness.homeEquipment")} items={homeEquipment} selected={health.available_equipment} onToggle={toggleEquipment} label={(item) => onboarding(`equipment.home.${item}`)} /> : null}
          <SelectField label={t("fitness.routine")} value={health.routine_type} onChange={(value) => updateHealth({ routine_type: value as RoutineType })} options={routineTypes} />
        </div>
        <button type="button" disabled={savingSection !== null} onClick={saveHealth} className="apex-button mt-5 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-60">
          {savingSection === "health" ? t("actions.saving") : t("actions.saveFitness")}
        </button>
      </details>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="apex-card rounded-3xl p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-white/65">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="apex-input rounded-2xl px-4 py-3 text-white" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-white/65">
      {label}
      <input type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="apex-input rounded-2xl px-4 py-3 text-white" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-white/65">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="apex-input rounded-2xl px-4 py-3 text-white">
        <option value="">-</option>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );
}

function ChipGroup<T extends string>({ title, items, selected, onToggle, label }: { title: string; items: T[]; selected: T[]; onToggle: (item: T) => void; label: (item: T) => string }) {
  return (
    <div>
      <p className="text-sm font-bold text-white/65">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item} type="button" onClick={() => onToggle(item)} className={`rounded-full border px-4 py-2 text-sm font-bold ${selected.includes(item) ? "border-[#a6ff00] bg-[#a6ff00] text-black" : "border-white/15 bg-white/[0.04] text-white/65"}`}>
            {label(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

function StateCard({ title }: { title: string }) {
  return <div className="apex-card rounded-[2rem] p-6 text-sm font-bold text-white/65">{title}</div>;
}

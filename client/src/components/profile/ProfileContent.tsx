"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { OptionChip, StepSection, TextField } from "@/components/onboarding/OnboardingUi";
import { PushOptIn } from "@/components/notifications/PushOptIn";
import { OfflineMediaStatus } from "@/components/profile/OfflineMediaStatus";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProgressStats } from "@/hooks/useProgressStats";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import { ApiError, authenticatedClientFetch } from "@/lib/api/authenticated-client";
import {
  DAYS_PER_WEEK,
  EQUIPMENT_TYPES,
  EXPERIENCE_LEVELS,
  GENDER_OPTIONS,
  HOME_EQUIPMENT,
  INTENSITY_PREFERENCES,
  PHYSICAL_GOALS,
  ROUTINE_TYPES,
  SESSION_DURATIONS,
  TRAINING_STYLES,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { setPreferredUnits } from "@/lib/preferredUnits";
import { getScheduledDay } from "@/lib/schedule";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { computeStreak } from "@/lib/streak";
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg } from "@/lib/units";
import { routinePeriodLabel } from "@/types/routine";
import type { OnboardingHealth, OnboardingProfile, UnitSystem } from "@/types/onboarding";

type ProfileResponse = OnboardingProfile & { id: string; created_at: string; updated_at: string };
type HealthResponse = OnboardingHealth & { id: string; created_at: string; updated_at: string };
type SettingsCache = { preferred_language: "es" | "en"; preferred_units: UnitSystem };

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
  experience_level: "",
  physical_goals: [],
  training_style: "",
  priority_muscles: [],
  intensity_preference: "",
  specific_goal: "",
  medical_conditions: [],
  injuries: [],
  equipment_type: "",
  available_equipment: [],
  routine_type: "",
  days_per_week: null,
  session_duration_minutes: null,
};

function numberOrNull(raw: string): number | null {
  const value = Number(raw);
  return raw.trim() === "" || !Number.isFinite(value) ? null : value;
}

export function ProfileContent({ locale }: { locale: string }) {
  const t = useTranslations("Profile");
  const onboarding = useTranslations("Onboarding.form");
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<OnboardingProfile>(emptyProfile(locale));
  const [health, setHealth] = useState<OnboardingHealth>(emptyHealth);
  const [isLoading, setIsLoading] = useState(true);
  const [profileDirty, setProfileDirty] = useState(false);
  const [healthDirty, setHealthDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { routine, lastSync } = useRoutineCache();
  const { stats } = useProgressStats();
  const { logs } = useDailyLogs();

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
        setPreferredUnits(profileResponse.preferred_units);
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
    setProfileDirty(true);
    setMessage(null);
    setError(null);
  }

  function updateHealth(value: Partial<OnboardingHealth>) {
    setHealth((current) => ({ ...current, ...value }));
    setHealthDirty(true);
    setMessage(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (profileDirty) {
        const response = await authenticatedClientFetch<ProfileResponse>("/api/v1/profile/", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        setProfile(response);
        setPreferredUnits(response.preferred_units);
        setInStorage(STORAGE_KEYS.PROFILE, response);
        setInStorage(STORAGE_KEYS.SETTINGS, {
          preferred_language: response.preferred_language,
          preferred_units: response.preferred_units,
        });
        setProfileDirty(false);
        if (response.preferred_language !== locale) {
          // The language setting also switches the interface, which lives in the URL.
          router.replace(pathname.replace(/^\/[a-z]{2}(?=\/|$)/, `/${response.preferred_language}`));
        }
      }
      if (healthDirty) {
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
        setHealthDirty(false);
      }
      setMessage(t("states.saved"));
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.detail : t("states.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function toggle<T extends string>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
  }

  const streak = useMemo(() => computeStreak(logs, routine), [logs, routine]);
  const cycle = useMemo(() => {
    if (!routine) return null;
    const scheduled = getScheduledDay(routine, new Date());
    if (!scheduled) return null;
    const total = routine.weeks.length;
    const index = Math.max(0, routine.weeks.findIndex((week) => week.id === scheduled.week.id));
    const weekday = ((new Date().getDay() + 6) % 7) + 1;
    return { current: index + 1, total, percent: Math.round(((index + (weekday - 1) / 7) / total) * 100) };
  }, [routine]);

  if (isLoading) {
    return (
      <p role="status" className="flex items-center gap-3 text-base font-bold text-white/70">
        <Loader2 aria-hidden="true" size={22} className="animate-spin" />
        {t("states.loading")}
      </p>
    );
  }

  const name = profile.full_name || "Apex";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dirty = profileDirty || healthDirty;
  const imperial = profile.preferred_units === "imperial";
  const heightImperial = profile.height_cm != null ? cmToFeetInches(profile.height_cm) : null;
  const injuries = health.injuries.length;

  return (
    <div className="flex flex-col gap-6 text-white">
      <div className="flex items-center gap-4">
        <div className="grid size-[76px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00] text-[28px] font-extrabold text-[#a6ff00]">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[32px] font-black leading-tight tracking-tight">{name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {health.experience_level ? (
              <span className="rounded-full border border-[#a6ff00]/55 bg-[#a6ff00]/[0.08] px-3 py-1 text-sm font-bold text-[#a6ff00]">
                {onboarding(`fitness.experience.${health.experience_level}.label`)}
              </span>
            ) : null}
            {health.days_per_week ? (
              <span className="rounded-full border border-white/[0.22] px-3 py-1 text-sm font-bold">
                {health.days_per_week} {onboarding("schedule.daysUnit")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-white/[0.13] pt-5">
        <Tile label={t("tiles.streak")} value={streak} accent />
        <Tile label={t("tiles.workouts")} value={stats?.completed_days ?? 0} />
        <Tile label={t("tiles.exercises")} value={stats?.total_exercises_completed ?? 0} />
      </dl>

      <Section title={t("plan.title")}>
        {routine ? (
          <>
            <span className="w-fit rounded-full border border-[#a6ff00]/55 bg-[#a6ff00]/[0.08] px-4 py-1.5 text-base font-extrabold text-[#a6ff00]">
              {routine.source === "manual"
                ? t("plan.manual")
                : t("plan.monthly", { period: routinePeriodLabel(routine) ?? "" })}
            </span>
            {cycle ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold text-white/60">{t("plan.cycle")}</span>
                  <span className="text-[17px] font-extrabold">{cycle.percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t("plan.cycle")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={cycle.percent}
                  className="h-3 rounded-full bg-white/10"
                >
                  <div className="h-full rounded-full bg-[#a6ff00]" style={{ width: `${cycle.percent}%` }} />
                </div>
                <p className="text-sm font-medium text-white/60">
                  {t("plan.week", { current: cycle.current, total: cycle.total })}
                </p>
              </div>
            ) : null}
            <LinkButton href={`/${locale}/routine`}>{t("plan.view")}</LinkButton>
          </>
        ) : (
          <>
            <p className="text-base text-white/60">{t("plan.none")}</p>
            <LinkButton href={`/${locale}/routine`}>{t("plan.choose")}</LinkButton>
          </>
        )}
      </Section>

      <Section title={t("settings.title")}>
        <StepSection title={t("settings.language")}>
          <div className="grid grid-cols-2 gap-2">
            {(["es", "en"] as const).map((option) => (
              <OptionChip
                key={option}
                tall
                selected={profile.preferred_language === option}
                onClick={() => updateProfile({ preferred_language: option })}
              >
                {t(`settings.languageOptions.${option}`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("settings.units")}>
          <div className="grid grid-cols-2 gap-2">
            {(["metric", "imperial"] as UnitSystem[]).map((option) => (
              <OptionChip
                key={option}
                tall
                selected={profile.preferred_units === option}
                onClick={() => updateProfile({ preferred_units: option })}
              >
                {t(`settings.unitOptions.${option}`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
      </Section>

      <Section title={t("base.title")}>
        <TextField
          id="profile-name"
          label={onboarding("personal.fullName")}
          value={profile.full_name}
          onChange={(value) => updateProfile({ full_name: value })}
        />
        <StepSection title={onboarding("personal.gender")}>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map((option) => (
              <OptionChip
                key={option}
                tall
                selected={profile.gender === option}
                onClick={() => updateProfile({ gender: option })}
              >
                {onboarding(`personal.genderOptions.${option}`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            id="profile-age"
            label={onboarding("personal.age")}
            type="number"
            inputMode="numeric"
            value={profile.age ?? ""}
            onChange={(value) => updateProfile({ age: numberOrNull(value) })}
            suffix={onboarding("personal.ageUnit")}
          />
          <TextField
            id="profile-weight"
            label={onboarding("personal.weight")}
            type="number"
            inputMode="decimal"
            value={profile.weight_kg == null ? "" : imperial ? kgToLb(profile.weight_kg) : profile.weight_kg}
            onChange={(value) => {
              const parsed = numberOrNull(value);
              updateProfile({ weight_kg: parsed == null ? null : imperial ? lbToKg(parsed) : parsed });
            }}
            suffix={imperial ? "lb" : "kg"}
          />
          {imperial ? (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="profile-height-ft"
                label={onboarding("personal.heightFeet")}
                type="number"
                inputMode="numeric"
                value={heightImperial?.feet ?? ""}
                onChange={(value) =>
                  updateProfile({ height_cm: feetInchesToCm(Number(value) || 0, heightImperial?.inches ?? 0) })
                }
                suffix="ft"
              />
              <TextField
                id="profile-height-in"
                label={onboarding("personal.heightInches")}
                type="number"
                inputMode="numeric"
                value={heightImperial?.inches ?? ""}
                onChange={(value) =>
                  updateProfile({ height_cm: feetInchesToCm(heightImperial?.feet ?? 0, Number(value) || 0) })
                }
                suffix="in"
              />
            </div>
          ) : (
            <TextField
              id="profile-height"
              label={onboarding("personal.height")}
              type="number"
              inputMode="numeric"
              value={profile.height_cm ?? ""}
              onChange={(value) => updateProfile({ height_cm: numberOrNull(value) })}
              suffix="cm"
            />
          )}
        </div>
      </Section>

      <Section title={t("prefs.title")}>
        <StepSection title={t("prefs.level")}>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_LEVELS.map((option) => (
              <OptionChip
                key={option}
                tall
                selected={health.experience_level === option}
                onClick={() => updateHealth({ experience_level: option })}
              >
                {onboarding(`fitness.experience.${option}.label`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("prefs.style")}>
          <div className="flex flex-wrap gap-2.5">
            {TRAINING_STYLES.map((option) => (
              <OptionChip
                key={option}
                selected={health.training_style === option}
                onClick={() => updateHealth({ training_style: option })}
              >
                {onboarding(`goals.styles.${option}.label`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("prefs.intensity")}>
          <div className="grid grid-cols-3 gap-2">
            {INTENSITY_PREFERENCES.map((option) => (
              <OptionChip
                key={option}
                tall
                selected={health.intensity_preference === option}
                onClick={() => updateHealth({ intensity_preference: option })}
              >
                {onboarding(`goals.intensity.${option}`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("prefs.goals")}>
          <div className="flex flex-wrap gap-2.5">
            {PHYSICAL_GOALS.map((goal) => (
              <OptionChip
                key={goal}
                showCheck
                selected={health.physical_goals.includes(goal)}
                onClick={() => updateHealth({ physical_goals: toggle(health.physical_goals, goal) })}
              >
                {onboarding(`goals.options.${goal}`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <TextField
          id="profile-specific-goal"
          label={t("prefs.specificGoal")}
          value={health.specific_goal}
          onChange={(value) => updateHealth({ specific_goal: value })}
        />
        <StepSection title={t("prefs.days")}>
          <div className="flex flex-wrap gap-2.5">
            {DAYS_PER_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={health.days_per_week === day}
                onClick={() => updateHealth({ days_per_week: day })}
                className={`grid size-12 place-items-center rounded-full text-lg font-extrabold ${
                  health.days_per_week === day
                    ? "border border-[#a6ff00] bg-[#a6ff00] text-black"
                    : "border border-white/[0.22]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("prefs.duration")}>
          <div className="flex flex-wrap gap-2.5">
            {SESSION_DURATIONS.map((minutes) => (
              <OptionChip
                key={minutes}
                selected={health.session_duration_minutes === minutes}
                onClick={() => updateHealth({ session_duration_minutes: minutes })}
              >
                {onboarding("schedule.minutes", { count: minutes })}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("prefs.routine")}>
          <div className="flex flex-wrap gap-2.5">
            {ROUTINE_TYPES.map((option) => (
              <OptionChip
                key={option}
                selected={health.routine_type === option}
                onClick={() => updateHealth({ routine_type: option })}
              >
                {onboarding(`schedule.routines.${option}.label`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        <StepSection title={t("prefs.equipment")}>
          <div className="flex flex-wrap gap-2.5">
            {EQUIPMENT_TYPES.map((option) => (
              <OptionChip
                key={option}
                selected={health.equipment_type === option}
                onClick={() =>
                  updateHealth({
                    equipment_type: option,
                    available_equipment: option === "home" ? health.available_equipment : [],
                  })
                }
              >
                {onboarding(`equipment.types.${option}.label`)}
              </OptionChip>
            ))}
          </div>
        </StepSection>
        {health.equipment_type === "home" ? (
          <StepSection title={t("prefs.homeEquipment")}>
            <div className="flex flex-wrap gap-2.5">
              {HOME_EQUIPMENT.map((item) => (
                <OptionChip
                  key={item}
                  showCheck
                  selected={health.available_equipment.includes(item)}
                  onClick={() => updateHealth({ available_equipment: toggle(health.available_equipment, item) })}
                >
                  {onboarding(`equipment.home.${item}`)}
                </OptionChip>
              ))}
            </div>
          </StepSection>
        ) : null}
        <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-4">
          <span className="text-base font-semibold text-white/60">{t("prefs.injuries")}</span>
          <span className="text-base font-bold">
            {injuries ? t("prefs.injuryCount", { count: injuries }) : t("prefs.noInjuries")}
          </span>
        </div>
      </Section>

      {message ? (
        <p role="status" className="flex items-center gap-2 text-[15px] font-semibold text-[#d7ff8a]">
          <CheckCircle2 aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-[15px] font-semibold text-red-300">
          <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        disabled={saving || !dirty}
        className="apex-button flex h-[60px] items-center justify-center rounded-[1.875rem] text-lg font-extrabold disabled:opacity-50"
      >
        {saving ? t("actions.saving") : t("actions.save")}
      </button>

      <PushOptIn />
      <OfflineMediaStatus />

      <Section title={t("sync.title")}>
        <div className="flex flex-col">
          <Row label={t("sync.last")} value={lastSync ? formatSync(lastSync, locale) : t("sync.never")} />
          <div className="h-px bg-white/10" />
          <Row
            label={t("sync.pending")}
            value={pendingSyncCount ? String(pendingSyncCount) : t("sync.noPending")}
            accent={pendingSyncCount === 0}
          />
        </div>
      </Section>

      <div className="border-t border-white/[0.13] pt-6">
        <LogoutButton label={t("actions.logout")} loadingLabel={t("actions.loggingOut")} />
      </div>
    </div>
  );
}

function formatSync(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(timestamp),
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-white/[0.13] pt-6">
      <h2 className="text-2xl font-black leading-tight tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dd className={`text-[34px] font-black leading-none ${accent ? "text-[#a6ff00]" : ""}`}>{value}</dd>
      <dt className="text-[13px] font-semibold leading-snug text-white/60">{label}</dt>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-base font-semibold text-white/60">{label}</span>
      <span className={`text-lg font-extrabold ${accent ? "text-[#a6ff00]" : ""}`}>{value}</span>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-14 items-center justify-center gap-2.5 rounded-[28px] border-[1.5px] border-white/30 text-lg font-bold"
    >
      {children}
      <ChevronRight aria-hidden="true" size={22} strokeWidth={1.8} />
    </Link>
  );
}

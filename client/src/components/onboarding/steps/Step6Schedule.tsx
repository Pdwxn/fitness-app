import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { DAYS_PER_WEEK, RECOMMENDED_ROUTINE_MAP, ROUTINE_TYPES, SESSION_DURATIONS } from "@/lib/constants";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { RoutineType } from "@/types/onboarding";

const days = [...DAYS_PER_WEEK];
const durations = [...SESSION_DURATIONS];
const routines = [...ROUTINE_TYPES];

export function Step6Schedule() {
  const t = useTranslations("Onboarding.form.schedule");
  const health = useOnboardingStore((state) => state.data.health);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  const recommendedRoutine = useMemo(
    () => (health.days_per_week ? RECOMMENDED_ROUTINE_MAP[health.days_per_week] : null),
    [health.days_per_week],
  );

  const selectRoutine = useCallback(
    (routine: RoutineType) => {
      updateHealth({ routine_type: routine });
    },
    [updateHealth],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-bold text-white/80">{t("daysLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => updateHealth({ days_per_week: day })}
              className={`flex size-12 items-center justify-center rounded-full text-lg font-black transition ${
                health.days_per_week === day
                  ? "border-[#a6ff00] bg-[#a6ff00] text-black"
                  : "border-white/20 bg-white/5 text-white/70"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("durationLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {durations.map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => updateHealth({ session_duration_minutes: duration })}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                health.session_duration_minutes === duration
                  ? "border-[#a6ff00] bg-[#a6ff00] text-black"
                  : "border-white/20 bg-white/5 text-white/70"
              }`}
            >
              {duration}min
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="mb-3 text-sm font-bold text-white/80">{t("routineLabel")}</p>
        <div className="grid gap-3">
          {routines.map((routine) => {
            const isRecommended = recommendedRoutine === routine;
            return (
              <button
                key={routine}
                type="button"
                onClick={() => selectRoutine(routine)}
                className={`relative rounded-3xl border p-4 text-left transition ${
                  health.routine_type === routine
                    ? "border-[#a6ff00] bg-[#a6ff00]/10 text-white"
                    : "border-white/15 bg-white/5 text-white/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="block text-lg font-black">
                      {t(`routines.${routine}.label`)}
                    </span>
                    <span className="mt-1 block text-sm opacity-70">
                      {t(`routines.${routine}.description`)}
                    </span>
                    <span className="mt-1 block text-xs text-white/50">
                      {t(`routines.${routine}.days`)}
                    </span>
                  </div>
                  {isRecommended ? (
                    <span className="shrink-0 rounded-full bg-[#a6ff00] px-3 py-1 text-xs font-black text-black">
                      {t("recommended")}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

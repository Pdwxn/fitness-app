"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save } from "lucide-react";

import { StepIndicator } from "./StepIndicator";
import { Step1Personal, validateStep1 } from "./steps/Step1Personal";
import { Step2Fitness } from "./steps/Step2Fitness";
import { Step3Goals } from "./steps/Step3Goals";
import { Step4Health } from "./steps/Step4Health";
import { Step5Equipment } from "./steps/Step5Equipment";
import { Step6Schedule } from "./steps/Step6Schedule";
import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { setPreferredUnits } from "@/lib/preferredUnits";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { TOTAL_STEPS, useOnboardingStore } from "@/store/onboardingStore";
import type { Routine } from "@/types/routine";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

const STEP_KEYS = ["personal", "fitness", "goals", "health", "equipment", "schedule"] as const;

function StepContent({ currentStep, showErrors }: { currentStep: number; showErrors: boolean }) {
  switch (currentStep) {
    case 1:
      return <Step1Personal showErrors={showErrors} />;
    case 2:
      return <Step2Fitness />;
    case 3:
      return <Step3Goals />;
    case 4:
      return <Step4Health />;
    case 5:
      return <Step5Equipment />;
    case 6:
      return <Step6Schedule />;
    default:
      return null;
  }
}

type OnboardingStatusResponse = {
  completed: boolean;
};

type OnboardingCompleteResponse = OnboardingStatusResponse & {
  routine_generated: boolean;
  routine: Routine | null;
  generation_error: { detail: string; code: string } | null;
};

type SubmitState = "idle" | "saving" | "generating";

function Logo({ className }: { className: string }) {
  return (
    <p className={`apex-logo ${className}`}>
      <span>APEX</span> <span className="apex-lime">FIT</span>
    </p>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="apex-bg flex min-h-screen items-center justify-center px-5 py-8 text-white">
      <div className="flex w-full max-w-md flex-col items-start gap-6">{children}</div>
    </main>
  );
}

export function OnboardingForm({ locale }: { locale: string }) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const previousStep = useOnboardingStore((state) => state.previousStep);
  const data = useOnboardingStore((state) => state.data);
  const reset = useOnboardingStore((state) => state.reset);
  const clearStorage = useOnboardingStore((state) => state.clearStorage);
  const hydrateFromStorage = useOnboardingStore((state) => state.hydrateFromStorage);
  const [error, setError] = useState<string | null>(null);
  const [showStepErrors, setShowStepErrors] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [generationFailed, setGenerationFailed] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    let cancelled = false;
    const cachedStatus = getFromStorage<OnboardingStatusResponse>(STORAGE_KEYS.ONBOARDING_STATUS);

    if (cachedStatus) {
      setIsCompleted(cachedStatus.completed);
      setIsLoadingStatus(false);
    }

    authenticatedClientFetch<OnboardingStatusResponse>("/api/v1/onboarding/status/")
      .then((response) => {
        if (!cancelled) {
          setIsCompleted(response.completed);
          setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, response);
        }
      })
      .catch(() => {
        if (!cancelled && !cachedStatus) setIsCompleted(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  function canContinue() {
    const { profile, health } = data;

    if (currentStep === 1) {
      return !Object.values(validateStep1(profile)).some(Boolean);
    }

    if (currentStep === 2) return Boolean(health.experience_level && health.activity_level);
    if (currentStep === 3) return health.physical_goals.length > 0 && Boolean(health.intensity_preference) && Boolean(health.training_style);
    if (currentStep === 4) {
      return health.injuries.every((injury) => injury.area.trim() && injury.description.trim());
    }
    if (currentStep === 5) {
      return Boolean(
        health.equipment_type &&
          (health.equipment_type !== "home" || health.available_equipment.length > 0),
      );
    }
    if (currentStep === 6) {
      return Boolean(health.days_per_week && health.session_duration_minutes && health.routine_type);
    }
    return true;
  }

  function reportInvalid() {
    if (currentStep === 1) {
      // Step 1 flags each offending field inline instead.
      setShowStepErrors(true);
      setError(null);
    } else {
      setError(t("validationError"));
    }
  }

  function handleNext() {
    if (!canContinue()) {
      reportInvalid();
      return;
    }

    setError(null);
    setShowStepErrors(false);
    nextStep();
  }

  async function handleSubmit() {
    if (!canContinue()) {
      reportInvalid();
      return;
    }

    setError(null);
    setGenerationFailed(false);
    setSubmitState("saving");

    try {
      setSubmitState("generating");
      const response = await authenticatedClientFetch<OnboardingCompleteResponse>(
        "/api/v1/onboarding/complete/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (response.completed) {
        setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, { completed: response.completed });
        setPreferredUnits(data.profile.preferred_units);
        if (response.routine) {
          setInStorage(STORAGE_KEYS.ROUTINE, response.routine);
        }
        clearStorage();
        reset();
        if (response.routine) {
          router.push(`/${locale}/dashboard`);
          router.refresh();
          return;
        }

        setGenerationFailed(Boolean(response.generation_error));
        setIsCompleted(true);
        router.refresh();
        return;
      }

      setError(t("submitError"));
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitState("idle");
    }
  }

  const isGenerating = submitState === "generating";
  const isSubmitting = submitState !== "idle";
  const stepLabels = STEP_KEYS.map((key) => t(`steps.${key}`));

  if (isLoadingStatus) {
    return (
      <CenteredMessage>
        <p role="status" className="flex items-center gap-3 text-base font-bold text-white/70">
          <Loader2 aria-hidden="true" size={22} className="animate-spin" />
          {t("loadingStatus")}
        </p>
      </CenteredMessage>
    );
  }

  if (isCompleted) {
    const Icon = generationFailed ? AlertTriangle : CheckCircle2;
    return (
      <CenteredMessage>
        <Logo className="text-2xl" />
        <span className="grid size-16 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/[0.12] text-[#a6ff00]">
          <Icon aria-hidden="true" size={32} strokeWidth={1.6} />
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-black leading-tight tracking-tight">
            {generationFailed ? t("generationFailed.title") : t("completed.title")}
          </h1>
          <p className="text-lg leading-snug text-white/60">
            {generationFailed ? t("generationFailed.description") : t("completed.description")}
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard`}
          className="apex-button flex h-[60px] w-full items-center justify-center gap-2.5 rounded-[1.875rem] text-lg font-extrabold"
        >
          {generationFailed ? t("generationFailed.goToDashboard") : t("completed.backHome")}
          <ArrowRight aria-hidden="true" size={22} strokeWidth={2.2} />
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <>
      {isGenerating ? <LoadingOverlay label={t("actions.generating")} /> : null}
      <main className="apex-bg relative min-h-screen overflow-hidden text-white">
        <div className="pointer-events-none absolute -top-40 left-[90px] size-[420px] rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.26)_0%,transparent_68%)] blur-[50px] md:left-1/2" />

        <div className="relative mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-44 pt-6 md:px-8">
          <div className="flex min-h-11 items-center px-1">
            <Logo className="text-[22px]" />
          </div>

          <StepIndicator currentStep={currentStep} labels={stepLabels} ariaLabel={t("progressLabel")} />

          <header className="flex flex-col gap-3 px-1 pt-2">
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-[#a6ff00]">
                {t("stepOf", { current: currentStep, total: TOTAL_STEPS })}
              </p>
              <h1 className="text-4xl font-black leading-[1.04] tracking-tight">
                {t(`stepTitles.${STEP_KEYS[currentStep - 1]}`)}
              </h1>
            </div>
            <p className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Save aria-hidden="true" size={18} strokeWidth={1.5} />
              {t("draftLoaded")}
            </p>
          </header>

          <div className="px-1 pt-1">
            <StepContent currentStep={currentStep} showErrors={showStepErrors} />
            {error ? (
              <p role="alert" className="mt-6 flex items-center gap-2 text-[15px] font-semibold leading-snug text-red-300">
                <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#020303] via-[#020303]/90 to-transparent px-4 pb-6 pt-10">
          <div className={`mx-auto grid max-w-[720px] gap-3 ${isFirstStep ? "grid-cols-1" : "grid-cols-[1fr_1.5fr]"}`}>
            {isFirstStep ? null : (
              <button
                type="button"
                onClick={previousStep}
                disabled={isSubmitting}
                className="flex h-[60px] items-center justify-center gap-2.5 rounded-[1.875rem] border-[1.5px] border-white/30 px-6 text-lg font-bold disabled:opacity-40"
              >
                <ArrowLeft aria-hidden="true" size={22} strokeWidth={2} />
                {t("actions.previous")}
              </button>
            )}
            <button
              type="button"
              onClick={isLastStep ? handleSubmit : handleNext}
              disabled={isSubmitting}
              className="apex-button flex h-[60px] items-center justify-center gap-2.5 rounded-[1.875rem] px-7 text-lg font-extrabold disabled:opacity-40"
            >
              {isSubmitting ? t("actions.submitting") : isLastStep ? t("actions.finish") : t("actions.next")}
              {isLastStep ? null : <ArrowRight aria-hidden="true" size={22} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

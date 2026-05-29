"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { StepIndicator } from "./StepIndicator";
import { Step1Personal } from "./steps/Step1Personal";
import { Step2Activity } from "./steps/Step2Activity";
import { Step3Goals } from "./steps/Step3Goals";
import { Step4Health } from "./steps/Step4Health";
import { Step5Equipment } from "./steps/Step5Equipment";
import { Step6RoutineType } from "./steps/Step6RoutineType";
import { authenticatedClientFetch } from "@/lib/api/authenticated-client";
import { getFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { TOTAL_STEPS, useOnboardingStore } from "@/store/onboardingStore";
import type { Routine } from "@/types/routine";

type OnboardingFormProps = {
  locale: string;
  labels: {
    title: string;
    description: string;
    next: string;
    previous: string;
    finish: string;
    draftLoaded: string;
    validationError: string;
    submitError: string;
    completedTitle: string;
    completedDescription: string;
    backHome: string;
    loadingStatus: string;
    submitting: string;
    generating: string;
    generationFailedTitle: string;
    generationFailedDescription: string;
    goToDashboard: string;
    steps: string[];
    placeholders: string[];
  };
};

function StepContent({ currentStep }: { currentStep: number }) {
  switch (currentStep) {
    case 1:
      return <Step1Personal />;
    case 2:
      return <Step2Activity />;
    case 3:
      return <Step3Goals />;
    case 4:
      return <Step4Health />;
    case 5:
      return <Step5Equipment />;
    case 6:
      return <Step6RoutineType />;
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

export function OnboardingForm({ locale, labels }: OnboardingFormProps) {
  const router = useRouter();
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const previousStep = useOnboardingStore((state) => state.previousStep);
  const data = useOnboardingStore((state) => state.data);
  const reset = useOnboardingStore((state) => state.reset);
  const clearStorage = useOnboardingStore((state) => state.clearStorage);
  const hydrateFromStorage = useOnboardingStore((state) => state.hydrateFromStorage);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [generationFailed, setGenerationFailed] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
    setHasHydrated(true);
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
      return Boolean(
        profile.full_name &&
          profile.gender &&
          profile.age &&
          profile.age >= 13 &&
          profile.age <= 100 &&
          profile.weight_kg &&
          profile.weight_kg >= 20 &&
          profile.weight_kg <= 400 &&
          profile.height_cm &&
          profile.height_cm >= 80 &&
          profile.height_cm <= 250,
      );
    }

    if (currentStep === 2) return Boolean(health.activity_level);
    if (currentStep === 3) return health.physical_goals.length > 0;
    if (currentStep === 4) {
      return health.injuries.every((injury) => injury.area.trim() && injury.description.trim());
    }
    if (currentStep === 5) {
      return Boolean(
        health.equipment_type &&
          (health.equipment_type !== "home" || health.available_equipment.length > 0),
      );
    }
    if (currentStep === 6) return Boolean(health.routine_type);
    return true;
  }

  function handleNext() {
    if (!canContinue()) {
      setError(labels.validationError);
      return;
    }

    setError(null);
    nextStep();
  }

  async function handleSubmit() {
    if (!canContinue()) {
      setError(labels.validationError);
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
        if (response.routine) {
          setInStorage(STORAGE_KEYS.ROUTINE, response.routine);
          setInStorage(STORAGE_KEYS.LAST_SYNC, Date.now());
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

      setError(labels.submitError);
    } catch {
      setError(labels.submitError);
    } finally {
      setSubmitState("idle");
    }
  }

  const isSubmitting = submitState !== "idle";
  const submitLabel = submitState === "generating" ? labels.generating : labels.submitting;

  if (isLoadingStatus) {
    return (
      <main className="apex-bg mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5 py-8 text-white">
        <p className="apex-card rounded-3xl px-5 py-4 text-sm font-bold text-white/70">
          {labels.loadingStatus}
        </p>
      </main>
    );
  }

  if (isCompleted) {
    return (
      <main className="apex-bg mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5 py-8 text-white">
        <section className="apex-card rounded-[2rem] p-6 text-center">
          <p className="apex-logo text-2xl">
            <span>APEX</span> <span className="apex-lime">FIT</span>
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            {generationFailed ? labels.generationFailedTitle : labels.completedTitle}
          </h1>
          <p className="mt-3 text-base leading-7 text-white/65">
            {generationFailed ? labels.generationFailedDescription : labels.completedDescription}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="apex-button mt-6 rounded-2xl px-5 py-3 text-sm font-black"
          >
            {generationFailed ? labels.goToDashboard : labels.backHome}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="apex-bg mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-5 py-8 text-white md:max-w-3xl md:px-10 lg:max-w-5xl">
      <header className="apex-card relative overflow-hidden rounded-[2rem] p-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-10 size-48 rounded-full bg-[#a6ff00]/20 blur-3xl" />
        <p className="apex-logo relative text-2xl">
          <span>APEX</span> <span className="apex-lime">FIT</span>
        </p>
        <h1 className="relative mt-4 text-4xl font-black tracking-tight md:text-5xl">
          {labels.title}
        </h1>
        <p className="relative mt-3 text-base leading-7 text-white/70 md:text-lg">
          {labels.description}
        </p>
      </header>

      <StepIndicator currentStep={currentStep} labels={labels.steps} />

      {hasHydrated ? (
        <p className="rounded-2xl border border-[#a6ff00]/20 bg-[#a6ff00]/10 px-4 py-3 text-sm font-medium text-[#d7ff8a]">
          {labels.draftLoaded}
        </p>
      ) : null}

      <section className="apex-card flex min-h-[18rem] flex-col justify-between rounded-[2rem] p-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">
            {labels.steps[currentStep - 1]}
          </p>
          <div className="apex-onboarding mt-6 rounded-3xl border border-white/10 bg-black/25 p-4 text-white md:p-6">
            <StepContent currentStep={currentStep} />
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={previousStep}
            disabled={isFirstStep}
            className="w-1/2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {labels.previous}
          </button>
          <button
            type="button"
            onClick={isLastStep ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className="apex-button w-1/2 rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? submitLabel : isLastStep ? labels.finish : labels.next}
          </button>
        </div>
      </section>
    </main>
  );
}

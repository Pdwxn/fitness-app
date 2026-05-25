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
import { setInStorage, STORAGE_KEYS } from "@/lib/storage";
import { TOTAL_STEPS, useOnboardingStore } from "@/store/onboardingStore";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
    setHasHydrated(true);
  }, [hydrateFromStorage]);

  useEffect(() => {
    let cancelled = false;

    authenticatedClientFetch<OnboardingStatusResponse>("/api/v1/onboarding/status/")
      .then((response) => {
        if (!cancelled) {
          setIsCompleted(response.completed);
          setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, response);
        }
      })
      .catch(() => {
        if (!cancelled) setIsCompleted(false);
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
    setIsSubmitting(true);

    try {
      const response = await authenticatedClientFetch<OnboardingStatusResponse>(
        "/api/v1/onboarding/complete/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (response.completed) {
        setInStorage(STORAGE_KEYS.ONBOARDING_STATUS, response);
        clearStorage();
        reset();
        router.push(`/${locale}`);
        router.refresh();
        return;
      }

      setError(labels.submitError);
    } catch {
      setError(labels.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingStatus) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-[#f7f3ec] px-5 py-8 text-[#17130f]">
        <p className="rounded-3xl bg-white/85 px-5 py-4 text-sm font-bold shadow-sm">
          {labels.loadingStatus}
        </p>
      </main>
    );
  }

  if (isCompleted) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-[#f7f3ec] px-5 py-8 text-[#17130f]">
        <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b5e34]">
            FIT AI
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">{labels.completedTitle}</h1>
          <p className="mt-3 text-base leading-7 text-[#5c5349]">{labels.completedDescription}</p>
          <button
            type="button"
            onClick={() => router.push(`/${locale}`)}
            className="mt-6 rounded-full bg-[#17130f] px-5 py-3 text-sm font-bold text-white"
          >
            {labels.backHome}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 bg-[#f7f3ec] px-5 py-8 text-[#17130f] md:max-w-3xl md:px-10 lg:max-w-5xl">
      <header className="rounded-[2rem] bg-[#17130f] p-6 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
          FIT AI
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
          {labels.title}
        </h1>
        <p className="mt-3 text-base leading-7 text-white/70 md:text-lg">
          {labels.description}
        </p>
      </header>

      <StepIndicator currentStep={currentStep} labels={labels.steps} />

      {hasHydrated ? (
        <p className="rounded-2xl border border-[#ded2bf] bg-white/70 px-4 py-3 text-sm font-medium text-[#5c5349]">
          {labels.draftLoaded}
        </p>
      ) : null}

      <section className="flex min-h-[18rem] flex-col justify-between rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
            {labels.steps[currentStep - 1]}
          </p>
          <div className="mt-6 rounded-3xl bg-[#f7f3ec] p-4 text-[#17130f] md:p-6">
            <StepContent currentStep={currentStep} />
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={previousStep}
            disabled={isFirstStep}
            className="w-1/2 rounded-full border border-[#17130f] px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {labels.previous}
          </button>
          <button
            type="button"
            onClick={isLastStep ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className="w-1/2 rounded-full bg-[#17130f] px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? labels.submitting : isLastStep ? labels.finish : labels.next}
          </button>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

import { StepIndicator } from "./StepIndicator";
import { TOTAL_STEPS, useOnboardingStore } from "@/store/onboardingStore";

type OnboardingFormProps = {
  labels: {
    title: string;
    description: string;
    next: string;
    previous: string;
    finish: string;
    draftLoaded: string;
    steps: string[];
    placeholders: string[];
  };
};

export function OnboardingForm({ labels }: OnboardingFormProps) {
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const previousStep = useOnboardingStore((state) => state.previousStep);
  const hydrateFromStorage = useOnboardingStore((state) => state.hydrateFromStorage);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
    setHasHydrated(true);
  }, [hydrateFromStorage]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

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
          <div className="mt-6 rounded-3xl border border-dashed border-[#ded2bf] bg-[#f7f3ec] p-6 text-[#5c5349]">
            {labels.placeholders[currentStep - 1]}
          </div>
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
            onClick={nextStep}
            disabled={isLastStep}
            className="w-1/2 rounded-full bg-[#17130f] px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLastStep ? labels.finish : labels.next}
          </button>
        </div>
      </section>
    </main>
  );
}

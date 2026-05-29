import { TOTAL_STEPS } from "@/store/onboardingStore";

type StepIndicatorProps = {
  currentStep: number;
  labels: string[];
};

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <section className="apex-card rounded-[2rem] p-4 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a6ff00]">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            {labels[currentStep - 1]}
          </h2>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#a6ff00] text-sm font-black text-black">
          {currentStep}/{TOTAL_STEPS}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#a6ff00] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 hidden gap-2 md:grid md:grid-cols-6">
        {labels.map((label, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;

          return (
            <div
              key={label}
              className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? "border-[#a6ff00] bg-[#a6ff00] text-black"
                  : isComplete
                    ? "border-[#a6ff00]/40 bg-[#a6ff00]/10 text-[#d7ff8a]"
                    : "border-white/10 bg-white/[0.04] text-white/50"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </section>
  );
}

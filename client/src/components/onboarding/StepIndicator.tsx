import { TOTAL_STEPS } from "@/store/onboardingStore";

type StepIndicatorProps = {
  currentStep: number;
  labels: string[];
};

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <section className="rounded-[2rem] border border-[#ded2bf] bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <h2 className="mt-1 text-xl font-black text-[#17130f]">
            {labels[currentStep - 1]}
          </h2>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#17130f] text-sm font-bold text-white">
          {currentStep}/{TOTAL_STEPS}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eadfce]">
        <div
          className="h-full rounded-full bg-[#8b5e34] transition-all duration-300"
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
                  ? "border-[#17130f] bg-[#17130f] text-white"
                  : isComplete
                    ? "border-[#8b5e34] bg-[#f7f3ec] text-[#8b5e34]"
                    : "border-[#ded2bf] bg-white text-[#5c5349]"
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

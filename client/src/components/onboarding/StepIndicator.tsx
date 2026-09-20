import { TOTAL_STEPS } from "@/store/onboardingStore";

type StepIndicatorProps = {
  currentStep: number;
  labels: string[];
  ariaLabel: string;
};

/** Six segments, one per step: done and current ones filled, with the step's short name underneath. */
export function StepIndicator({ currentStep, labels, ariaLabel }: StepIndicatorProps) {
  return (
    <ol aria-label={ariaLabel} className="grid list-none grid-cols-6 gap-1.5 p-0">
      {labels.slice(0, TOTAL_STEPS).map((label, index) => {
        const step = index + 1;
        const isCurrent = step === currentStep;
        const isReached = step <= currentStep;

        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-col items-center gap-2"
          >
            <span className={`h-1.5 w-full rounded-full ${isReached ? "bg-[#a6ff00]" : "bg-white/[0.16]"}`} />
            <span
              className={`max-w-full truncate text-xs tracking-tight ${
                isCurrent ? "font-extrabold text-[#a6ff00]" : isReached ? "font-semibold text-white" : "font-semibold text-white/60"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

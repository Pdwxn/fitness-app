import { AlertCircle, Info, type LucideIcon } from "lucide-react";

type StatusCardProps = {
  message: string;
  tone?: "neutral" | "warning" | "error";
  /** Optional retry/next-step button under the message. */
  action?: { label: string; onClick: () => void };
};

const styles: Record<NonNullable<StatusCardProps["tone"]>, { box: string; icon: string; Icon: LucideIcon }> = {
  neutral: { box: "border-white/[0.22] bg-white/5", icon: "text-[#a6ff00]", Icon: Info },
  warning: { box: "border-white/[0.22] bg-white/5", icon: "text-[#a6ff00]", Icon: Info },
  error: { box: "border-red-400/55 bg-red-400/[0.08]", icon: "text-red-400", Icon: AlertCircle },
};

export function StatusCard({ message, tone = "neutral", action }: StatusCardProps) {
  const { box, icon, Icon } = styles[tone];

  return (
    <section
      role={tone === "error" ? "alert" : "status"}
      className={`flex flex-col gap-3 rounded-3xl border px-[18px] py-4 text-white ${box}`}
    >
      <p className="flex items-start gap-3 text-[15px] font-semibold leading-snug">
        <Icon aria-hidden="true" size={22} strokeWidth={1.7} className={`mt-0.5 shrink-0 ${icon}`} />
        {message}
      </p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="flex h-11 w-fit items-center rounded-full border border-white/[0.22] px-5 text-[15px] font-bold"
        >
          {action.label}
        </button>
      ) : null}
    </section>
  );
}

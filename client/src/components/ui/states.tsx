import { AlertCircle, type LucideIcon } from "lucide-react";

/** Big icon, headline and one line, with an optional button: the shape shared by empty and error states. */
function Message({
  icon: Icon,
  tone,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  tone: "lime" | "red";
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const ring =
    tone === "red"
      ? "border-red-400/55 bg-red-400/[0.08] text-red-400"
      : "border-[#a6ff00]/55 bg-[#a6ff00]/[0.08] text-[#a6ff00]";

  return (
    <div className="flex flex-col items-start gap-5 border-t border-white/[0.13] pt-7 text-white">
      <span className={`grid size-[72px] place-items-center rounded-full border-[1.5px] ${ring}`}>
        <Icon aria-hidden="true" size={34} strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-2">
        <p className="text-[26px] font-black leading-tight tracking-tight">{title}</p>
        {description ? <p className="text-[17px] leading-snug text-white/60">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="status">
      <Message icon={icon} tone="lime" title={title} description={description} action={action} />
    </div>
  );
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div role="alert">
      <Message
        icon={AlertCircle}
        tone="red"
        title={title}
        description={description}
        action={
          actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="apex-button flex h-14 items-center justify-center rounded-[28px] px-8 text-lg font-extrabold"
            >
              {actionLabel}
            </button>
          ) : null
        }
      />
    </div>
  );
}

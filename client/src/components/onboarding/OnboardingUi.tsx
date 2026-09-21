"use client";

import { AlertCircle, Check, type LucideIcon } from "lucide-react";

/** A titled block of options/fields inside a step. */
export function StepSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-[17px] font-bold">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-white/60">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Pill option. Multi-select pills show a check when selected; single-select ones just fill. */
export function OptionChip({
  selected,
  onClick,
  children,
  showCheck = false,
  tall = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  showCheck?: boolean;
  /** 56px, full-width-in-grid variant (genders, units, intensity). */
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 text-center leading-tight transition-colors ${
        tall ? "min-h-14 rounded-[28px] px-4 text-[15px]" : "min-h-12 rounded-3xl px-[18px] text-base"
      } ${
        selected
          ? "border border-[#a6ff00] bg-[#a6ff00] font-extrabold text-black"
          : "border border-white/[0.22] font-semibold text-white"
      }`}
    >
      {selected && showCheck ? <Check aria-hidden="true" size={18} strokeWidth={2.4} className="shrink-0" /> : null}
      <span>{children}</span>
    </button>
  );
}

/** Large card option with a title, a description and a radio/check indicator. */
export function OptionCard({
  selected,
  onClick,
  title,
  description,
  detail,
  icon: Icon,
  badge,
  compact = false,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  detail?: string;
  icon?: LucideIcon;
  badge?: string;
  /** Smaller, no indicator: for dense grids like medical conditions. */
  compact?: boolean;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full text-left transition-colors ${
        compact
          ? "min-h-[84px] flex-col items-start gap-1 rounded-[22px] px-4 py-3.5"
          : "min-h-[84px] items-center gap-3.5 rounded-3xl px-[18px] py-4"
      } ${
        selected
          ? "border border-[#a6ff00] bg-[#a6ff00] text-black"
          : "border border-white/[0.13] bg-white/[0.065] text-white"
      }`}
    >
      {Icon ? <Icon aria-hidden="true" size={28} strokeWidth={1.6} className="shrink-0" /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={compact ? "text-[17px] font-extrabold" : "text-[19px] font-extrabold"}>{title}</span>
          {badge ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                selected ? "bg-black text-[#a6ff00]" : "bg-[#a6ff00] text-black"
              }`}
            >
              {badge}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className={`leading-snug font-medium ${compact ? "text-sm" : "text-[15px]"} ${selected ? "text-black/75" : "text-white/60"}`}>
            {description}
          </span>
        ) : null}
        {detail ? (
          <span className={`text-[13px] font-semibold ${selected ? "text-black/75" : "text-white/45"}`}>{detail}</span>
        ) : null}
      </span>
      {compact ? null : (
        <span
          aria-hidden="true"
          className={`grid size-7 shrink-0 place-items-center ${multi ? "rounded-lg" : "rounded-full"} ${
            selected ? "bg-black text-[#a6ff00]" : "border-[1.5px] border-white/30"
          }`}
        >
          {selected ? <Check size={18} strokeWidth={2.6} /> : null}
        </span>
      )}
    </button>
  );
}

/** Label above, hairline-topped row, optional unit suffix, optional error. */
export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  suffix,
  error,
  hideLabel = false,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  inputMode?: "numeric" | "decimal";
  suffix?: string;
  error?: string | null;
  hideLabel?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-[15px] font-semibold"}>
        {label}
      </label>
      <div
        className={`flex items-center gap-2 transition-colors focus-within:border-[#a6ff00] ${
          multiline ? "min-h-28 items-start" : "h-14"
        } ${error ? "rounded-[20px] border border-red-400 bg-white/[0.065] pl-4" : "border-t border-white/[0.13]"}`}
      >
        {multiline ? (
          <textarea
            id={id}
            name={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            className="min-h-28 min-w-0 flex-1 resize-none bg-transparent py-3.5 text-[17px] text-white outline-none placeholder:text-[#8f8f89]"
          />
        ) : (
          <input
            id={id}
            name={id}
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-white outline-none placeholder:text-[#8f8f89]"
          />
        )}
        {suffix ? <span className="pr-2.5 text-base font-semibold text-white/60">{suffix}</span> : null}
      </div>
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-[15px] font-semibold leading-snug text-red-300">
          <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

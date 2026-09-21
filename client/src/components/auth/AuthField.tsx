"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, type LucideIcon } from "lucide-react";

type AuthFieldProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
  minLength?: number;
  /** Shown under the field, which turns red. */
  error?: string | null;
  /** Accessible names for the show/hide password toggle. */
  revealLabels?: { show: string; hide: string };
};

/** Label above, a hairline-topped row with a leading icon (and a show/hide toggle for passwords). */
export function AuthField({
  id,
  label,
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled = false,
  minLength,
  error,
  revealLabels,
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <div
        className={`flex h-[58px] items-center gap-3 transition-colors focus-within:border-[#a6ff00] ${
          error
            ? "rounded-[20px] border border-red-400 bg-white/[0.065] pl-4 pr-1.5"
            : "border-t border-white/[0.13]"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0 text-white/60" />
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-white outline-none placeholder:text-[#8f8f89]"
        />
        {isPassword && revealLabels ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            disabled={disabled}
            aria-label={revealed ? revealLabels.hide : revealLabels.show}
            className="grid size-11 shrink-0 place-items-center text-white/60"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" size={22} strokeWidth={1.5} />
            ) : (
              <Eye aria-hidden="true" size={22} strokeWidth={1.5} />
            )}
          </button>
        ) : null}
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

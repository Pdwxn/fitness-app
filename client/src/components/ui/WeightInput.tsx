"use client";

import { useState } from "react";

import { displayToKg, kgToDisplay, type WeightUnit } from "@/lib/units";

type WeightInputProps = {
  /** The weight as stored: kilograms, as text. */
  valueKg: string | number | null | undefined;
  unit: WeightUnit;
  onChangeKg: (kg: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
};

/**
 * A weight field that shows and takes the user's unit but hands back kilograms.
 * While it has focus it keeps exactly what was typed ("12." mid-decimal), so
 * converting back and forth never eats a keystroke.
 */
export function WeightInput({ valueKg, unit, onChangeKg, className, placeholder, id, ...aria }: WeightInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? kgToDisplay(valueKg, unit);

  return (
    <input
      id={id}
      inputMode="decimal"
      value={shown}
      placeholder={placeholder}
      aria-label={aria["aria-label"]}
      className={className}
      onChange={(event) => {
        setDraft(event.target.value);
        onChangeKg(displayToKg(event.target.value, unit));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

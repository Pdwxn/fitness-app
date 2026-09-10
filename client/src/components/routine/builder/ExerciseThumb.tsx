"use client";

import { useState } from "react";

type ExerciseThumbProps = {
  src: string;
  name: string;
};

/**
 * Small exercise thumbnail for the picker. Images come from an external host
 * (free-exercise-db on GitHub), so they only load online — on failure or when
 * missing we fall back to the exercise's initial. Row height stays fixed either
 * way.
 */
export function ExerciseThumb({ src, name }: ExerciseThumbProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/10 text-sm font-black text-white/60">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-11 shrink-0 rounded-lg bg-white/5 object-cover"
    />
  );
}

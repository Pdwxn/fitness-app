"use client";

import { useState } from "react";

type ExerciseThumbProps = {
  src: string;
  gifSrc?: string;
  name: string;
};

/**
 * Small exercise thumbnail for the picker. Prefers the animated demo (gif)
 * when the catalog entry has one -- a still photo often isn't enough to tell
 * exercises apart, an animation is. Images/gifs come from an external host,
 * so they only load online -- on failure or when missing we fall back to the
 * exercise's initial. Row height stays fixed either way.
 */
export function ExerciseThumb({ src, gifSrc, name }: ExerciseThumbProps) {
  const [failed, setFailed] = useState(false);
  const resolved = gifSrc || src;

  if (!resolved || failed) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/10 text-sm font-black text-white/60">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-11 shrink-0 rounded-lg bg-white/5 object-cover"
    />
  );
}

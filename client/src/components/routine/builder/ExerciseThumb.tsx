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
      <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/[0.13] bg-gradient-to-br from-white/[0.08] to-transparent text-lg font-black text-white/40">
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
      className="size-16 shrink-0 rounded-2xl border border-white/[0.13] bg-white/5 object-cover"
    />
  );
}

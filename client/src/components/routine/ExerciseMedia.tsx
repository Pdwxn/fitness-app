"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type ExerciseMediaProps = {
  name: string;
  /** Still photo, shown until the user asks for the demo. */
  imageUrl: string;
  /** Animated demo (gif). Only loaded when the user taps "ver demo". */
  demoUrl: string;
};

/**
 * Exercise picture with an in-place demo: tapping the button swaps the still
 * for the animated gif inside the same box, instead of opening another tab.
 * The gif is user-initiated (nothing animates on its own) and only fetched on
 * tap, so a day full of exercises doesn't autoplay six animations.
 */
export function ExerciseMedia({ name, imageUrl, demoUrl }: ExerciseMediaProps) {
  const t = useTranslations("RoutineDay.demo");
  const [playing, setPlaying] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [demoFailed, setDemoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageUrl && !demoUrl) return null;

  const showDemo = playing && !demoFailed;
  const showImage = !showDemo && imageUrl && !imageFailed;

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    // A fresh tap is a retry: a previous failure (e.g. offline) shouldn't stick.
    setDemoFailed(false);
    setDemoLoaded(false);
    setPlaying(true);
  }

  return (
    <div className="mt-4">
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black/40"
        style={{ aspectRatio: "16 / 9", maxHeight: 280 }}
      >
        {showDemo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={demoUrl}
            alt={t("alt", { name })}
            onLoad={() => setDemoLoaded(true)}
            onError={() => {
              setDemoFailed(true);
              setPlaying(false);
            }}
            className="size-full object-contain"
          />
        ) : null}
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-full object-contain"
          />
        ) : null}
        {!showDemo && !showImage ? (
          <div
            aria-hidden="true"
            className="grid size-full place-items-center text-5xl font-black text-white/15"
          >
            {name.trim().charAt(0).toUpperCase()}
          </div>
        ) : null}
        {showDemo && !demoLoaded ? (
          <div
            role="status"
            className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white/80"
          >
            {t("loading")}
          </div>
        ) : null}
      </div>

      {demoUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={showDemo}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/70 transition hover:bg-white/20"
          >
            {showDemo ? t("stop") : t("play")}
          </button>
          {demoFailed ? (
            <p role="alert" className="text-xs font-bold text-amber-200">
              {t("error")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

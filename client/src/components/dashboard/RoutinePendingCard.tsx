"use client";

import { useState } from "react";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { authenticatedClientFetch, ApiError } from "@/lib/api/authenticated-client";
import type { RoutineCache } from "@/types/routine";

type GenerateResponse = {
  detail: string;
  routine: RoutineCache;
};

type RoutinePendingCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges: [string, string, string];
  cta: string;
  generating: string;
  error: string;
  retry: string;
  onRoutineGenerated?: () => void;
};

export function RoutinePendingCard({
  eyebrow,
  title,
  description,
  badges,
  cta,
  generating,
  error: errorLabel,
  retry,
  onRoutineGenerated,
}: RoutinePendingCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await authenticatedClientFetch<GenerateResponse>(
        "/api/v1/routines/generate/",
        { method: "POST" },
      );

      if (response.routine) {
        onRoutineGenerated?.();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || errorLabel);
      } else {
        setError(errorLabel);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      {isGenerating ? <LoadingOverlay label={generating} /> : null}
      <section className="apex-card overflow-hidden rounded-[2rem] text-white">
        <div className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">{description}</p>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 text-center text-sm font-bold text-white/60">
          <div className="p-4">{badges[0]}</div>
          <div className="border-x border-white/10 p-4">{badges[1]}</div>
          <div className="p-4">{badges[2]}</div>
        </div>
        <div className="border-t border-white/10 px-6 py-4">
          {error ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-red-400">{error}</p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="apex-button shrink-0 rounded-xl px-5 py-2.5 text-sm font-black"
              >
                {retry}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="apex-button w-full rounded-2xl py-3 text-base font-black"
            >
              {cta}
            </button>
          )}
        </div>
      </section>
    </>
  );
}

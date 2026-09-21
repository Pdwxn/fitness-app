"use client";

import { Loader2 } from "lucide-react";

type LoadingOverlayProps = {
  label?: string;
};

/** Full-screen "working on it" card, for the few actions that take a while (generating a routine). */
export function LoadingOverlay({ label }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-5 rounded-[2rem] border border-white/[0.13] bg-white/[0.08] px-10 py-9 text-center"
      >
        <Loader2 aria-hidden="true" size={44} strokeWidth={2} className="animate-spin text-[#a6ff00]" />
        {label ? <p className="text-xl font-black tracking-tight text-white">{label}</p> : null}
      </div>
    </div>
  );
}

"use client";

type LoadingOverlayProps = {
  label?: string;
};

export function LoadingOverlay({ label }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm">
      <div className="size-12 animate-spin rounded-full border-4 border-white/10 border-t-[#a6ff00]" />
      {label ? (
        <p className="text-lg font-black tracking-tight text-white">{label}</p>
      ) : null}
    </div>
  );
}

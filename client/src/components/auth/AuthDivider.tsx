export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <div className="h-px flex-1 bg-white/[0.13]" />
      <span className="text-sm font-bold tracking-[0.18em] text-white/60">{label}</span>
      <div className="h-px flex-1 bg-white/[0.13]" />
    </div>
  );
}

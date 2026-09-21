/** Pulsing placeholder block; sizes come from `className`. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-white/[0.09] ${className}`} />;
}

/** A loading page: a title bar, then hairline-separated rows -- close enough to any of the app's screens. */
export function PageSkeleton({ label, rows = 4, hero = false }: { label: string; rows?: number; hero?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-11 w-2/3 rounded-xl" />
      {hero ? <Skeleton className="h-64 rounded-[2rem]" /> : null}
      <div className="flex flex-col gap-5 border-t border-white/[0.13] pt-6">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3.5">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="h-5 w-3/5 rounded-lg" />
              <Skeleton className="h-3.5 w-2/5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

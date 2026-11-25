type StatsPreviewProps = {
  labels: {
    title: string;
    completedDays: string;
    totalExercises: string;
    activeRoutine: string;
    lastSync: string;
    pending: string;
    never: string;
  };
  /** `null` while the totals are still unknown (nothing stored yet, server not answered). */
  completedDays: number | null;
  totalExercises: number | null;
  activeRoutine: string;
  lastSync: string | null;
  /** True while the first load is in flight: unknown values read "—" instead of a misleading 0 / "Never". */
  loading?: boolean;
};

const UNKNOWN = "—";

/** Totals at a glance: hairline-topped section, big figures, no boxes. */
export function StatsPreview({
  labels,
  completedDays,
  totalExercises,
  activeRoutine,
  lastSync,
  loading = false,
}: StatsPreviewProps) {
  const stats = [
    { label: labels.completedDays, value: completedDays === null ? UNKNOWN : String(completedDays), big: true },
    { label: labels.totalExercises, value: totalExercises === null ? UNKNOWN : String(totalExercises), big: true },
    { label: labels.activeRoutine, value: activeRoutine || labels.pending, big: false },
    { label: labels.lastSync, value: lastSync ?? (loading ? UNKNOWN : labels.never), big: false },
  ];

  return (
    <section className="flex flex-col gap-4 border-t border-white/[0.13] pt-6 text-white">
      <h2 className="text-[22px] font-extrabold tracking-tight">{labels.title}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-1.5">
            <dd
              className={`truncate font-black leading-none ${item.big ? "text-[34px] text-[#a6ff00]" : "text-xl"}`}
              title={item.value}
            >
              {item.value}
            </dd>
            <dt className="text-[13px] font-semibold leading-snug text-white/60">{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

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
  completedDays: number;
  totalExercises: number;
  activeRoutine: string;
  lastSync: string | null;
};

export function StatsPreview({
  labels,
  completedDays,
  totalExercises,
  activeRoutine,
  lastSync,
}: StatsPreviewProps) {
  const stats = [
    { label: labels.completedDays, value: String(completedDays) },
    { label: labels.totalExercises, value: String(totalExercises) },
    { label: labels.activeRoutine, value: activeRoutine || labels.pending },
    { label: labels.lastSync, value: lastSync ?? labels.never },
  ];

  return (
    <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
      <h2 className="text-2xl font-black tracking-tight">{labels.title}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl bg-[#f7f3ec] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b5e34]">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-black">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

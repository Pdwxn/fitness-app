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
    <section className="apex-card rounded-[2rem] p-6 text-white">
      <h2 className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">{labels.title}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

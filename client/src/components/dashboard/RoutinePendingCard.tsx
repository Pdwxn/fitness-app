type RoutinePendingCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
};

export function RoutinePendingCard({ eyebrow, title, description, cta }: RoutinePendingCardProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#ded2bf] bg-[#17130f] text-white shadow-xl">
      <div className="p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">{description}</p>
        <button
          type="button"
          disabled
          className="mt-6 rounded-full bg-white/15 px-5 py-3 text-sm font-bold text-white/70"
        >
          {cta}
        </button>
      </div>
      <div className="grid grid-cols-3 border-t border-white/10 text-center text-sm font-bold text-white/60">
        <div className="p-4">4 weeks</div>
        <div className="border-x border-white/10 p-4">AI ready</div>
        <div className="p-4">Offline cache</div>
      </div>
    </section>
  );
}

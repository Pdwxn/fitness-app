type PlaceholderCardProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderCard({ eyebrow, title, description }: PlaceholderCardProps) {
  return (
    <section className="rounded-[2rem] border border-[#ded2bf] bg-white/85 p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight">{title}</h2>
      <p className="mt-3 text-base leading-7 text-[#5c5349]">{description}</p>
    </section>
  );
}

import Link from "next/link";

type OnboardingRequiredCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
};

export function OnboardingRequiredCard({
  href,
  eyebrow,
  title,
  description,
  cta,
}: OnboardingRequiredCardProps) {
  return (
    <section className="rounded-[2rem] border border-[#ded2bf] bg-white/90 p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight">{title}</h2>
      <p className="mt-3 text-base leading-7 text-[#5c5349]">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-full bg-[#17130f] px-5 py-3 text-sm font-bold text-white"
      >
        {cta}
      </Link>
    </section>
  );
}

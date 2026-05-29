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
    <section className="apex-card rounded-[2rem] p-6 text-white">
      <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight">{title}</h2>
      <p className="mt-3 text-base leading-7 text-white/65">{description}</p>
      <Link
        href={href}
        className="apex-button mt-6 inline-flex rounded-2xl px-5 py-3 text-sm font-black"
      >
        {cta}
      </Link>
    </section>
  );
}

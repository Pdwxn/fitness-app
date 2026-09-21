import { AthleteSilhouette } from "@/components/ui/AthleteSilhouette";

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function AuthLogo({ className }: { className: string }) {
  return (
    <p className={`apex-logo ${className}`}>
      <span>APEX</span> <span className="apex-lime">FIT</span>
    </p>
  );
}

/** Shared frame for the sign-in / sign-up pages: hero artwork + title, then the form. Split layout on desktop. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="apex-bg relative min-h-screen overflow-hidden text-white">
      <div className="relative h-[262px] overflow-hidden md:hidden">
        <div className="pointer-events-none absolute -top-10 left-[60px] size-[360px] rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.5)_0%,transparent_68%)] blur-[50px]" />
        <AthleteSilhouette className="pointer-events-none absolute -bottom-[22px] -right-[22px] h-[283px] w-[250px]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#020303]" />
        <AuthLogo className="absolute left-5 top-6 text-[22px]" />
        <h1 className="absolute bottom-6 left-5 max-w-[210px] text-[40px] font-black leading-[1.02] tracking-tight">
          {title}
        </h1>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-[60px] hidden w-[640px] overflow-hidden md:block">
        <div className="absolute left-10 top-[60px] size-[560px] rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.6)_0%,transparent_68%)] blur-[70px]" />
        <AthleteSilhouette className="absolute right-0 top-0 h-[725px] w-[640px]" />
        <div className="absolute inset-x-0 top-[560px] h-[165px] bg-gradient-to-b from-transparent to-[#020303]" />
      </div>

      <div className="relative px-5 pb-8 pt-3 md:px-20 md:pt-12">
        <AuthLogo className="hidden text-[28px] md:block" />
        <div className="flex flex-col gap-5 md:mt-12 md:max-w-[480px]">
          <h1 className="hidden text-6xl font-black leading-none tracking-tight md:block">{title}</h1>
          {description ? <p className="text-lg font-medium leading-snug text-white/60 md:text-xl">{description}</p> : null}
          {children}
        </div>
      </div>
    </main>
  );
}

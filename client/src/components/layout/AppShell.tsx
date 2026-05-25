import { getTranslations } from "next-intl/server";

import { BottomNav } from "./BottomNav";
import { PrivateHeader } from "./PrivateHeader";
import { SilentSync } from "./SilentSync";

type AppShellProps = {
  locale: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export async function AppShell({ locale, title, description, children }: AppShellProps) {
  const t = await getTranslations("PrivateLayout.nav");
  const navItems = [
    { href: `/${locale}/dashboard`, label: t("dashboard"), icon: "⌂" },
    { href: `/${locale}/progress`, label: t("progress"), icon: "↗" },
    { href: `/${locale}/profile`, label: t("profile"), icon: "◉" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f3ec] pb-24 text-[#17130f] md:pb-0 md:pl-64">
      <SilentSync />
      <BottomNav items={navItems} sidebarTitle={t("sidebarTitle")} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8 md:max-w-3xl md:px-10 lg:max-w-5xl">
        <PrivateHeader title={title} description={description} />
        {children}
      </main>
    </div>
  );
}

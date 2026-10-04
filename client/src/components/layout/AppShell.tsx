import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { getSessionUserLabel } from "@/lib/session";

import { BottomNav, type NavIconName } from "./BottomNav";
import { ConnectionBanner } from "./ConnectionBanner";
import { PrivateHeader } from "./PrivateHeader";
import { NextRoutineWatcher } from "../routine/NextRoutineWatcher";
import { SilentSync } from "./SilentSync";

type AppShellProps = {
  locale: string;
  title: string;
  description: string;
  /** The page renders its own header (its own hero, back button, etc.) instead of the generic one. */
  hideHeader?: boolean;
  children: React.ReactNode;
};

export async function AppShell({ locale, title, description, hideHeader, children }: AppShellProps) {
  // Not awaited here: the Supabase round trip for the user's email would delay
  // every private page. The nav and header stream in once it resolves.
  const t = await getTranslations("PrivateLayout.nav");
  const userLabelPromise = getSessionUserLabel();
  const navItems: { href: string; label: string; icon: NavIconName }[] = [
    { href: `/${locale}/dashboard`, label: t("dashboard"), icon: "home" },
    { href: `/${locale}/routine`, label: t("routine"), icon: "routine" },
    { href: `/${locale}/progress`, label: t("progress"), icon: "progress" },
    { href: `/${locale}/profile`, label: t("profile"), icon: "profile" },
  ];

  return (
    <div className="apex-bg min-h-screen pb-28 text-white md:pb-0 md:pl-64">
      <SilentSync />
      <NextRoutineWatcher locale={locale} />
      <Suspense fallback={null}>
        <BottomNav items={navItems} userLabel={userLabelPromise} />
      </Suspense>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8 md:max-w-3xl md:px-10 lg:max-w-5xl">
        <ConnectionBanner />
        {hideHeader ? null : (
          <Suspense fallback={null}>
            <PrivateHeader title={title} description={description} userLabel={userLabelPromise} />
          </Suspense>
        )}
        {children}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, TrendingUp, User } from "lucide-react";

export type NavIconName = "home" | "routine" | "progress" | "profile";

const ICONS: Record<NavIconName, typeof Home> = {
  home: Home,
  routine: Dumbbell,
  progress: TrendingUp,
  profile: User,
};

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

type BottomNavProps = {
  items: NavItem[];
  userLabel: string;
};

export function BottomNav({ items, userLabel }: BottomNavProps) {
  const pathname = usePathname();
  const userInitial = userLabel.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed bottom-5 left-4 right-4 z-50 flex h-[68px] items-center gap-1 rounded-[2.125rem] border border-white/[0.13] bg-[#141614]/80 p-1.5 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl md:hidden"
        style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom))" }}
      >
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`grid flex-1 place-items-center gap-0.5 rounded-full py-2 text-[13px] font-bold transition ${
                isActive ? "bg-[#a6ff00] text-black" : "text-white/65 hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 1.6 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <aside className="hidden md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:gap-10 md:border-r md:border-white/[0.13] md:bg-white/[0.03] md:p-5 md:pt-9">
        <p className="apex-logo px-2 text-2xl"><span>APEX</span> <span className="apex-lime">FIT</span></p>
        <nav aria-label="Sidebar navigation" className="flex flex-col gap-1.5">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-[52px] items-center gap-3.5 rounded-full px-5 text-[17px] font-bold transition ${
                  isActive ? "bg-[#a6ff00] text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 1.6 : 1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-white/[0.13] pt-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00] text-lg font-black text-[#a6ff00]">
            {userInitial}
          </div>
          <p className="truncate text-[17px] font-bold">{userLabel}</p>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type BottomNavProps = {
  items: NavItem[];
  sidebarTitle: string;
};

export function BottomNav({ items, sidebarTitle }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed bottom-4 left-4 right-4 z-50 flex h-20 items-center justify-around rounded-[2rem] border border-white/15 bg-black/80 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl md:hidden">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-bold transition ${
                isActive ? "text-[#a6ff00]" : "text-white/55 hover:text-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-7 place-items-center rounded-xl text-lg leading-none ${
                  isActive ? "bg-[#a6ff00] text-black shadow-[0_0_24px_rgba(166,255,0,0.4)]" : "bg-white/5"
                }`}
              >
                {item.icon}
              </span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <aside className="hidden md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-white/10 md:bg-black/80 md:p-5 md:backdrop-blur-xl">
        <div className="apex-card rounded-[2rem] p-5 text-white">
          <p className="apex-logo text-lg"><span>APEX</span> <span className="apex-lime">FIT</span></p>
          <p className="mt-3 text-2xl font-black">{sidebarTitle}</p>
        </div>
        <nav className="mt-6 flex flex-col gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  isActive ? "bg-[#a6ff00] text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

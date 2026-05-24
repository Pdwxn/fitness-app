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
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#ded2bf] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(23,19,15,0.08)] backdrop-blur md:hidden">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-20 flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-bold transition ${
                isActive ? "bg-[#17130f] text-white" : "text-[#5c5349]"
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <aside className="hidden md:fixed md:left-0 md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-[#ded2bf] md:bg-white md:p-5">
        <div className="rounded-[2rem] bg-[#17130f] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">FIT AI</p>
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
                  isActive ? "bg-[#17130f] text-white" : "text-[#5c5349] hover:bg-[#f7f3ec]"
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  label: string;
  loadingLabel: string;
};

export function LogoutButton({ label, loadingLabel }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    setIsLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-[#a6ff00]/70 hover:text-[#a6ff00] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}

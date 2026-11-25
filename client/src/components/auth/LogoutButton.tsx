"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { db, META_KEYS } from "@/lib/db";
import { queryClient } from "@/lib/query-client";
import { useNextRoutineStore } from "@/store/nextRoutineStore";
import { useSyncIssuesStore } from "@/store/syncIssuesStore";
import { clearAllCaches } from "@/lib/mediaCache";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_KEYS } from "@/lib/storage";

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
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    await Promise.all([
      db.routineCache.clear(),
      db.dailyLogs.clear(),
      db.pendingSync.clear(),
      db.stats.clear(),
      // The logs cursor belongs to the user who just left; keeping it would make the next user skip their own history.
      db.meta.delete(META_KEYS.logsSyncedAt),
      // Cached API responses and media belong to the user who just left.
      clearAllCaches().catch(() => undefined),
    ]);
    // In-memory state belongs to the user who just left too: without this the
    // next sign-in in the same tab starts from their cached routine, stats and
    // sync flags until each one happens to be refetched.
    queryClient.clear();
    useNextRoutineStore.setState({ nextRoutine: null, nextProposal: null });
    useSyncIssuesStore.setState({ droppedLogCount: 0 });
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

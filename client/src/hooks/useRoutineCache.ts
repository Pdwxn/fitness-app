import { useEffect, useState } from "react";

import { getFromStorage, STORAGE_KEYS } from "@/lib/storage";
import type { ProgressStats } from "@/types/progress";
import type { RoutineCache } from "@/types/routine";

export function useRoutineCache() {
  const [routine, setRoutine] = useState<RoutineCache | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    setRoutine(getFromStorage<RoutineCache>(STORAGE_KEYS.ROUTINE));
    setStats(getFromStorage<ProgressStats>(STORAGE_KEYS.STATS));
    setLastSync(getFromStorage<number>(STORAGE_KEYS.LAST_SYNC));
  }, []);

  return { routine, stats, lastSync };
}

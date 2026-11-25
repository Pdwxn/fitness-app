import { fetchActiveRoutine } from "@/hooks/useRoutineCache";
import { fetchProgressStats } from "@/hooks/useProgressStats";

import { queryClient } from "./query-client";
import { queryKeys } from "./query-keys";
import { pullLogs } from "./sync";

/**
 * Starts the requests the home screen needs, without waiting for them.
 *
 * Right after sign-in the device holds no local data (logout wipes it), so the
 * home would otherwise sit on "looking for your routine" while the page itself
 * is still being rendered on the server. Kicking the requests off at once lets
 * the two run side by side; the home's own queries reuse them by key.
 */
export function prefetchHomeData(): void {
  // prefetchQuery never rejects: a failure is simply retried by the screen.
  void queryClient.prefetchQuery({ queryKey: queryKeys.routine.active(), queryFn: fetchActiveRoutine, staleTime: 60_000 });
  void queryClient.prefetchQuery({ queryKey: queryKeys.progress.stats(), queryFn: fetchProgressStats, staleTime: 30_000 });
  void queryClient.prefetchQuery({ queryKey: queryKeys.progress.logs(), queryFn: pullLogs, staleTime: 30_000 });
}

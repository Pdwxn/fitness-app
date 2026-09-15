import { authenticatedClientFetch } from "./authenticated-client";
import type { ManualRoutineDraft, Routine } from "@/types/routine";

export async function createManualRoutine(draft: ManualRoutineDraft): Promise<Routine> {
  return authenticatedClientFetch<Routine>("/api/v1/routines/manual/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
}

/** Replaces the full weeks/days/exercises tree of an existing manual routine. */
export async function updateManualRoutine(
  routineId: string,
  draft: ManualRoutineDraft,
): Promise<Routine> {
  return authenticatedClientFetch<Routine>(`/api/v1/routines/${routineId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
}

export async function deactivateRoutine(routineId: string): Promise<void> {
  await authenticatedClientFetch<void>(`/api/v1/routines/${routineId}/deactivate/`, {
    method: "POST",
  });
}

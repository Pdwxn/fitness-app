import { ApiError, authenticatedClientFetch } from "./authenticated-client";
import type { RoutineEditProposal } from "@/types/coach";
import type { Routine } from "@/types/routine";

/** The AI coach's pending proposal for the active routine, or `null` if there is none. */
export async function fetchPendingProposal(): Promise<RoutineEditProposal | null> {
  try {
    return await authenticatedClientFetch<RoutineEditProposal>("/api/v1/routines/proposals/pending/");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Applies the proposal; returns the updated routine. */
export async function approveProposal(proposalId: string): Promise<Routine> {
  return authenticatedClientFetch<Routine>(`/api/v1/routines/proposals/${proposalId}/approve/`, {
    method: "POST",
  });
}

/** Keeps the routine as is; returns it (relabelled for the new period). */
export async function rejectProposal(proposalId: string): Promise<Routine> {
  return authenticatedClientFetch<Routine>(`/api/v1/routines/proposals/${proposalId}/reject/`, {
    method: "POST",
  });
}

import { authenticatedClientFetch } from "./authenticated-client";
import type { Exercise, PaginatedResponse } from "@/types/exercise";

const PAGE_SIZE = 200;

export async function fetchExerciseCatalogPage(
  page: number,
  updatedSince?: string,
): Promise<PaginatedResponse<Exercise>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
  if (updatedSince) params.set("updated_since", updatedSince);
  return authenticatedClientFetch<PaginatedResponse<Exercise>>(
    `/api/v1/exercises/?${params.toString()}`,
  );
}

export type RemovedExercise = { external_id: string; updated_at: string };

/** Exercises taken out of the catalog since `updatedSince` (the delta list only carries active rows). */
export async function fetchRemovedExercises(updatedSince: string): Promise<RemovedExercise[]> {
  const params = new URLSearchParams({ updated_since: updatedSince });
  const data = await authenticatedClientFetch<{ removed: RemovedExercise[] }>(
    `/api/v1/exercises/removed/?${params.toString()}`,
  );
  return data.removed;
}

/**
 * Walks every page of `GET /api/v1/exercises/` and returns matching exercises.
 * Pass `updatedSince` (an ISO timestamp, e.g. from the last successful sync)
 * for a delta -- only exercises changed since then. Omit it for the full
 * catalog (~5 requests for the current ~873-exercise dataset).
 *
 * Removed exercises don't show up in a delta; use `fetchRemovedExercises`.
 */
export async function fetchFullExerciseCatalog(updatedSince?: string): Promise<Exercise[]> {
  const all: Exercise[] = [];
  let page = 1;
  // Hard stop well above any realistic catalog size.
  for (let guard = 0; guard < 100; guard += 1) {
    const data = await fetchExerciseCatalogPage(page, updatedSince);
    all.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return all;
}

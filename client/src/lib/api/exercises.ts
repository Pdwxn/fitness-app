import { authenticatedClientFetch } from "./authenticated-client";
import type { Exercise, PaginatedResponse } from "@/types/exercise";

const PAGE_SIZE = 200;

export async function fetchExerciseCatalogPage(
  page: number,
): Promise<PaginatedResponse<Exercise>> {
  return authenticatedClientFetch<PaginatedResponse<Exercise>>(
    `/api/v1/exercises/?page=${page}&page_size=${PAGE_SIZE}`,
  );
}

/**
 * Walks every page of `GET /api/v1/exercises/` and returns the full catalog.
 * ~5 requests for the current ~873-exercise dataset.
 */
export async function fetchFullExerciseCatalog(): Promise<Exercise[]> {
  const all: Exercise[] = [];
  let page = 1;
  // Hard stop well above any realistic catalog size.
  for (let guard = 0; guard < 100; guard += 1) {
    const data = await fetchExerciseCatalogPage(page);
    all.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return all;
}

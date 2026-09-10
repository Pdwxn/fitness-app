/** Mirrors `StoredExerciseSerializer` on the backend (`GET /api/v1/exercises/`). */
export type Exercise = {
  external_id: string;
  name: string;
  force: string;
  level: string;
  mechanic: string;
  equipment: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  category: string;
  instructions: string;
  image_url: string;
  updated_at: string;
};

export type CatalogFilters = {
  search: string;
  muscle: string;
  equipment: string;
  category: string;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  search: "",
  muscle: "",
  equipment: "",
  category: "",
};

/** DRF PageNumberPagination envelope. */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

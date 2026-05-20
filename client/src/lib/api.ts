const API_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://localhost:8000";

export type HealthCheck = {
  status: string;
  service: string;
};

export async function getHealthCheck(): Promise<HealthCheck> {
  return apiFetch<HealthCheck>("/api/v1/health/", {
    cache: "no-store",
  });
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

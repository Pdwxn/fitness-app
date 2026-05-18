const API_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://localhost:8000";

export type HealthCheck = {
  status: string;
  service: string;
};

export async function getHealthCheck(): Promise<HealthCheck> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Backend healthcheck failed");
  }

  return response.json();
}

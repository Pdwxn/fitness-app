import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://localhost:8000";

type ApiErrorBody = {
  detail?: unknown;
  code?: unknown;
};

export class ApiError extends Error {
  status: number;
  detail: string;
  code: string | null;

  constructor(status: number, detail: string, code: string | null = null) {
    super(detail || `API request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

export async function authenticatedClientFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    const detail = typeof body?.detail === "string" ? body.detail : `API request failed: ${response.status}`;
    const code = typeof body?.code === "string" ? body.code : null;
    throw new ApiError(response.status, detail, code);
  }

  return response.json();
}

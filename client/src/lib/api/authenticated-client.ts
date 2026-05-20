import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://localhost:8000";

export async function authenticatedClientFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

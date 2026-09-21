import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

// One client per tab, kept on globalThis so a dev hot reload doesn't create a
// second GoTrueClient that fights the first for the auth-token Web Lock
// ("Acquiring an exclusive Navigator LockManager lock ... immediately failed").
const globalWithClient = globalThis as typeof globalThis & { __apexSupabaseClient?: BrowserClient };

export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  if (!globalWithClient.__apexSupabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    globalWithClient.__apexSupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return globalWithClient.__apexSupabaseClient;
}

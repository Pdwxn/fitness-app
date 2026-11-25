import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { AuthTimeoutError, withTimeout } from "@/lib/supabase/timeout";

const getClaims = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getClaims } }) }));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({ supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "key", djangoApiUrl: "" }),
}));

const { updateSupabaseSession } = await import("@/lib/supabase/middleware");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("withTimeout", () => {
  it("passes the value through when the promise settles in time", async () => {
    await expect(withTimeout(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it("rejects with AuthTimeoutError when it takes too long", async () => {
    const pending = withTimeout(new Promise(() => {}), 1000);
    const assertion = expect(pending).rejects.toBeInstanceOf(AuthTimeoutError);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
  });
});

describe("updateSupabaseSession", () => {
  const withCookie = () =>
    new NextRequest("https://app.test/es/dashboard", { headers: { cookie: "sb-abc-auth-token=token" } });
  const withoutCookie = () => new NextRequest("https://app.test/es/dashboard");

  it("returns the user from the verified claims", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
    const result = await updateSupabaseSession(withCookie());
    expect(result.user).toEqual({ id: "user-1" });
    expect(result.degraded).toBe(false);
  });

  it("returns no user when there are no claims", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const result = await updateSupabaseSession(withoutCookie());
    expect(result.user).toBeNull();
    expect(result.degraded).toBe(false);
  });

  it("is degraded, not logged out, when Supabase never answers and a session cookie exists", async () => {
    getClaims.mockReturnValue(new Promise(() => {}));
    const pending = updateSupabaseSession(withCookie());
    await vi.advanceTimersByTimeAsync(5000);
    const result = await pending;
    expect(result.degraded).toBe(true);
  });

  it("is not degraded when Supabase never answers and there is no session cookie", async () => {
    getClaims.mockReturnValue(new Promise(() => {}));
    const pending = updateSupabaseSession(withoutCookie());
    await vi.advanceTimersByTimeAsync(5000);
    const result = await pending;
    expect(result.degraded).toBe(false);
    expect(result.user).toBeNull();
  });
});

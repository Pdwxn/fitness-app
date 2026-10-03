import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import type { RoutineCache } from "@/types/routine";

const authenticatedClientFetch = vi.fn();
vi.mock("@/lib/api/authenticated-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/authenticated-client")>()),
  authenticatedClientFetch: (path: string) => authenticatedClientFetch(path),
}));

const { useRoutineCache } = await import("@/hooks/useRoutineCache");

const stored = { id: "local-routine", source: "manual", weeks: [] } as unknown as RoutineCache;
const fresh = { id: "server-routine", source: "manual", weeks: [] } as unknown as RoutineCache;

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(async () => {
  authenticatedClientFetch.mockReset();
  await db.routineCache.clear();
});

describe("useRoutineCache (offline first)", () => {
  it("shows the stored routine right away, without waiting for the network", async () => {
    await db.routineCache.put(stored);
    authenticatedClientFetch.mockReturnValue(new Promise(() => {})); // never answers

    const { result } = renderHook(() => useRoutineCache(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.routine?.id).toBe("local-routine"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it("keeps showing the stored routine, flagged as a fallback, when the server fails", async () => {
    await db.routineCache.put(stored);
    authenticatedClientFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useRoutineCache(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isOfflineFallback).toBe(true));
    expect(result.current.routine?.id).toBe("local-routine");
    expect(result.current.hasError).toBe(false);
  });

  it("replaces the stored copy with the server answer", async () => {
    await db.routineCache.put(stored);
    authenticatedClientFetch.mockResolvedValue(fresh);

    const { result } = renderHook(() => useRoutineCache(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.routine?.id).toBe("server-routine"));
    expect(result.current.isOfflineFallback).toBe(false);
  });

  it("reports an error only when there is nothing stored and the server fails", async () => {
    authenticatedClientFetch.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useRoutineCache(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.routine).toBeNull();
  });
});

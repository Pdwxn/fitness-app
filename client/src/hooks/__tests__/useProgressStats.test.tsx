import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

const authenticatedClientFetch = vi.fn();
vi.mock("@/lib/api/authenticated-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/authenticated-client")>()),
  authenticatedClientFetch: (path: string) => authenticatedClientFetch(path),
}));

const { useProgressStats } = await import("@/hooks/useProgressStats");

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(async () => {
  authenticatedClientFetch.mockReset();
  await db.stats.clear();
  await db.pendingSync.clear();
});

describe("useProgressStats (offline first)", () => {
  it("shows the stored totals right away, without waiting for the network", async () => {
    await db.stats.put({ id: "progress", completed_days: 7, total_exercises_completed: 40, pending_sync: 0 });
    authenticatedClientFetch.mockReturnValue(new Promise(() => {})); // never answers

    const { result } = renderHook(() => useProgressStats(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.stats?.completed_days).toBe(7));
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps the stored totals, flagged as a fallback, when the server fails", async () => {
    await db.stats.put({ id: "progress", completed_days: 7, total_exercises_completed: 40, pending_sync: 0 });
    authenticatedClientFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useProgressStats(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isOfflineFallback).toBe(true));
    expect(result.current.stats?.completed_days).toBe(7);
    expect(result.current.hasError).toBe(false);
  });

  it("replaces the stored totals with the server answer", async () => {
    await db.stats.put({ id: "progress", completed_days: 7, total_exercises_completed: 40, pending_sync: 0 });
    authenticatedClientFetch.mockResolvedValue({ completed_days: 9, total_exercises_completed: 55, pending_sync: 0 });

    const { result } = renderHook(() => useProgressStats(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.stats?.completed_days).toBe(9));
  });

  it("reports an error only when there is nothing stored either", async () => {
    authenticatedClientFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useProgressStats(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.stats).toBeNull();
  });
});

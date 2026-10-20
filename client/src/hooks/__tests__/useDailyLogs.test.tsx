import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import type { DailyLog } from "@/types/progress";

const authenticatedClientFetch = vi.fn();
vi.mock("@/lib/api/authenticated-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/authenticated-client")>()),
  authenticatedClientFetch: (path: string) => authenticatedClientFetch(path),
}));

const { useDailyLogs } = await import("@/hooks/useDailyLogs");

function makeLog(id: string, date: string): DailyLog {
  return { id, routine_day_id: "day-1", date, completed: true, day_note: "", exercises_done: [] };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(async () => {
  authenticatedClientFetch.mockReset();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("useDailyLogs (offline first)", () => {
  it("shows the stored logs right away, without waiting for the network", async () => {
    await db.dailyLogs.bulkAdd([makeLog("a", "2026-01-10")]);
    authenticatedClientFetch.mockReturnValue(new Promise(() => {})); // never answers

    const { result } = renderHook(() => useDailyLogs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.logs.map((l) => l.id)).toEqual(["a"]));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it("keeps showing the stored logs, flagged as a fallback, when the server fails", async () => {
    await db.dailyLogs.bulkAdd([makeLog("a", "2026-01-10")]);
    authenticatedClientFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useDailyLogs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isOfflineFallback).toBe(true));
    expect(result.current.logs.map((l) => l.id)).toEqual(["a"]);
    expect(result.current.hasError).toBe(false);
  });

  it("reports an error only when there is nothing stored and the server fails", async () => {
    authenticatedClientFetch.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useDailyLogs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.logs).toEqual([]);
  });
});

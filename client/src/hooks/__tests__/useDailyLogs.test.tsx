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

describe("useDailyLogs (incremental sync)", () => {
  function logAt(id: string, date: string, updated_at: string): DailyLog {
    return { ...makeLog(id, date), updated_at };
  }

  it("downloads everything the first time and remembers the newest update", async () => {
    authenticatedClientFetch.mockResolvedValue([
      logAt("a", "2026-01-10", "2026-01-10T10:00:00Z"),
      logAt("b", "2026-01-11", "2026-01-11T10:00:00Z"),
    ]);

    const { result } = renderHook(() => useDailyLogs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.logs.map((l) => l.id).sort()).toEqual(["a", "b"]));
    expect(authenticatedClientFetch).toHaveBeenCalledWith("/api/v1/progress/logs/");
    expect((await db.meta.get("logs_synced_at"))?.value).toBe("2026-01-11T10:00:00Z");
  });

  it("then asks only for changes since that cursor and keeps the logs it already has", async () => {
    await db.dailyLogs.bulkAdd([logAt("a", "2026-01-10", "2026-01-10T10:00:00Z")]);
    await db.meta.put({ key: "logs_synced_at", value: "2026-01-10T10:00:00Z" });
    authenticatedClientFetch.mockResolvedValue([logAt("c", "2026-01-12", "2026-01-12T10:00:00Z")]);

    const { result } = renderHook(() => useDailyLogs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.logs.map((l) => l.id).sort()).toEqual(["a", "c"]));
    expect(authenticatedClientFetch).toHaveBeenCalledWith(
      `/api/v1/progress/logs/?updated_since=${encodeURIComponent("2026-01-10T10:00:00Z")}`,
    );
    expect(await db.dailyLogs.count()).toBe(2);
    expect((await db.meta.get("logs_synced_at"))?.value).toBe("2026-01-12T10:00:00Z");
  });

  it("downloads everything again when a cursor exists but the local logs are gone", async () => {
    await db.meta.put({ key: "logs_synced_at", value: "2026-01-10T10:00:00Z" });
    authenticatedClientFetch.mockResolvedValue([logAt("a", "2026-01-10", "2026-01-10T10:00:00Z")]);

    renderHook(() => useDailyLogs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(authenticatedClientFetch).toHaveBeenCalledWith("/api/v1/progress/logs/"));
  });

  it("filters by routine day locally", async () => {
    authenticatedClientFetch.mockResolvedValue([
      { ...logAt("a", "2026-01-10", "2026-01-10T10:00:00Z"), routine_day_id: "day-1" },
      { ...logAt("b", "2026-01-11", "2026-01-11T10:00:00Z"), routine_day_id: "day-2" },
    ]);

    const { result } = renderHook(() => useDailyLogs({ routineDayId: "day-2" }), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.logs.map((l) => l.id)).toEqual(["b"]));
  });
});

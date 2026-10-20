import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/authenticated-client";
import { db } from "@/lib/db";
import { useSyncIssuesStore } from "@/store/syncIssuesStore";
import type { DailyLog, DailyLogBatchResponse } from "@/types/progress";

const authenticatedClientFetch = vi.fn();
vi.mock("@/lib/api/authenticated-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/authenticated-client")>()),
  authenticatedClientFetch: (path: string, init?: RequestInit) => authenticatedClientFetch(path, init),
}));

const { syncPendingLogs } = await import("@/lib/sync");

function pendingLog(id: string, date: string): DailyLog {
  return {
    id,
    routine_day_id: `day-${id}`,
    date,
    completed: true,
    day_note: "",
    exercises_done: [],
  };
}

async function queue(...logs: DailyLog[]) {
  for (const log of logs) {
    await db.pendingSync.add({ id: `pending-${log.id}`, log, createdAt: `${log.date}T00:00:00Z` });
  }
}

beforeEach(async () => {
  authenticatedClientFetch.mockReset();
  await Promise.all(db.tables.map((table) => table.clear()));
  useSyncIssuesStore.getState().clearDroppedLogs();
});

describe("syncPendingLogs", () => {
  it("sends everything in one batch and clears the queue on success", async () => {
    const a = pendingLog("a", "2026-01-10");
    const b = pendingLog("b", "2026-01-11");
    await queue(a, b);
    const response: DailyLogBatchResponse = { created: 2, updated: 0, logs: [a, b] };
    authenticatedClientFetch.mockResolvedValue(response);

    const ok = await syncPendingLogs();

    expect(ok).toBe(true);
    expect(authenticatedClientFetch).toHaveBeenCalledTimes(1);
    expect(authenticatedClientFetch).toHaveBeenCalledWith("/api/v1/progress/logs/batch/", expect.anything());
    expect(await db.pendingSync.count()).toBe(0);
    expect((await db.dailyLogs.toArray()).map((l) => l.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps the whole queue for a network/server error, without touching individual logs", async () => {
    await queue(pendingLog("a", "2026-01-10"));
    authenticatedClientFetch.mockRejectedValue(new Error("network down"));

    const ok = await syncPendingLogs();

    expect(ok).toBe(false);
    expect(authenticatedClientFetch).toHaveBeenCalledTimes(1);
    expect(await db.pendingSync.count()).toBe(1);
  });

  it("falls back to one-by-one and drops only the log the server permanently rejects", async () => {
    const good = pendingLog("good", "2026-01-10");
    const bad = pendingLog("bad", "2026-01-11");
    await queue(good, bad);

    authenticatedClientFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/v1/progress/logs/batch/") {
        return Promise.reject(new ApiError(400, "routine day does not belong to the current user"));
      }
      const sent = JSON.parse(String(init?.body)) as DailyLog;
      if (sent.id === "bad") return Promise.reject(new ApiError(400, "Routine day does not belong to the current user."));
      return Promise.resolve(sent);
    });

    const ok = await syncPendingLogs();

    expect(ok).toBe(false); // partial failure is still reported, so the caller knows
    const remaining = await db.pendingSync.toArray();
    expect(remaining.map((item) => item.log.id)).toEqual([]); // the bad one is dropped, not kept
    expect((await db.dailyLogs.toArray()).map((l) => l.id)).toEqual(["good"]);
    expect(useSyncIssuesStore.getState().droppedLogCount).toBe(1);
  });

  it("keeps a log in the one-by-one fallback when its own failure is a network error", async () => {
    const good = pendingLog("good", "2026-01-10");
    const flaky = pendingLog("flaky", "2026-01-11");
    await queue(good, flaky);

    authenticatedClientFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/v1/progress/logs/batch/") {
        return Promise.reject(new ApiError(400, "bad batch"));
      }
      const sent = JSON.parse(String(init?.body)) as DailyLog;
      if (sent.id === "flaky") return Promise.reject(new Error("network down"));
      return Promise.resolve(sent);
    });

    const ok = await syncPendingLogs();

    expect(ok).toBe(false);
    const remaining = await db.pendingSync.toArray();
    expect(remaining.map((item) => item.log.id)).toEqual(["flaky"]);
    expect(useSyncIssuesStore.getState().droppedLogCount).toBe(0);
  });
});

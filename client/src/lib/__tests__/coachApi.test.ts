import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/authenticated-client";
import { db } from "@/lib/db";
import { useNextRoutineStore } from "@/store/nextRoutineStore";
import type { DailyLog } from "@/types/progress";

const fetchMock = vi.fn();

vi.mock("@/lib/api/authenticated-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/authenticated-client")>();
  return {
    ...actual,
    authenticatedClientFetch: (...args: unknown[]) => fetchMock(...args),
  };
});

const { approveProposal, fetchPendingProposal, rejectProposal } = await import("@/lib/api/coach");
const { syncPendingLogs } = await import("@/lib/sync");

beforeEach(() => {
  fetchMock.mockReset();
  useNextRoutineStore.setState({ nextRoutine: null, nextProposal: null });
});

describe("coach api", () => {
  it("fetchPendingProposal returns the proposal", async () => {
    fetchMock.mockResolvedValue({ id: "p1", status: "pending" });
    expect(await fetchPendingProposal()).toEqual({ id: "p1", status: "pending" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/routines/proposals/pending/");
  });

  it("fetchPendingProposal maps a 404 to null", async () => {
    fetchMock.mockRejectedValue(new ApiError(404, "No pending proposal.", "not_found"));
    expect(await fetchPendingProposal()).toBeNull();
  });

  it("fetchPendingProposal rethrows anything else", async () => {
    fetchMock.mockRejectedValue(new ApiError(500, "boom", "server"));
    await expect(fetchPendingProposal()).rejects.toBeInstanceOf(ApiError);
  });

  it("approve and reject POST to the right endpoints", async () => {
    fetchMock.mockResolvedValue({ id: "r1" });
    await approveProposal("p1");
    await rejectProposal("p2");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/routines/proposals/p1/approve/", {
      method: "POST",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/routines/proposals/p2/reject/", {
      method: "POST",
    });
  });
});

describe("log sync surfaces the coach's proposal", () => {
  const log: DailyLog = {
    id: "l1",
    routine_day_id: "d1",
    date: "2026-09-01",
    completed: true,
    day_note: "",
    exercises_done: [],
  };

  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await db.pendingSync.add({ id: "s1", log, createdAt: "2026-09-01T00:00:00Z" });
  });

  it("stores next_proposal from the batch response", async () => {
    fetchMock.mockResolvedValue({
      created: 1,
      updated: 0,
      logs: [log],
      next_proposal: { id: "p9", target_month: 10, target_year: 2026 },
    });

    expect(await syncPendingLogs()).toBe(true);

    expect(useNextRoutineStore.getState().nextProposal).toEqual({
      id: "p9",
      target_month: 10,
      target_year: 2026,
    });
    expect(useNextRoutineStore.getState().nextRoutine).toBeNull();
  });

  it("leaves the store alone when there is no proposal", async () => {
    fetchMock.mockResolvedValue({ created: 1, updated: 0, logs: [log] });
    await syncPendingLogs();
    expect(useNextRoutineStore.getState().nextProposal).toBeNull();
  });
});

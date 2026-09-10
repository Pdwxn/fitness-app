import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { usePendingRoutine } from "@/hooks/usePendingRoutine";
import { db } from "@/lib/db";
import type { ManualRoutineDraft } from "@/types/routine";

const draft: ManualRoutineDraft = { weeks: [] };

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("usePendingRoutine", () => {
  it("settles to not-loading / no-pending when the queue is empty", async () => {
    const { result } = renderHook(() => usePendingRoutine());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPending).toBe(false);
    expect(result.current.pendingRoutine).toBeNull();
  });

  it("reports the queued routine", async () => {
    await db.pendingRoutines.add({
      id: "p1",
      payload: draft,
      createdAt: "2026-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => usePendingRoutine());

    await waitFor(() => expect(result.current.hasPending).toBe(true));
    expect(result.current.pendingRoutine?.id).toBe("p1");
    expect(result.current.isLoading).toBe(false);
  });
});

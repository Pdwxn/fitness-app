import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { makeFakeCaches } from "@/test/fakeCaches";

const signOut = vi.fn(async () => undefined);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut } }),
}));

const { LogoutButton } = await import("../LogoutButton");

describe("LogoutButton", () => {
  it("wipes local data AND every cached response/media file", async () => {
    const fakeCaches = makeFakeCaches();
    vi.stubGlobal("caches", fakeCaches);
    await (await fakeCaches.open("apex-fit-v2")).put("https://api.test/api/v1/profile/", new Response("private"));
    await (await fakeCaches.open("apex-fit-media-v1")).put("https://cdn.test/a.gif", new Response("gif"));
    await db.stats.put({ id: "progress", completed_days: 1, total_exercises_completed: 1, pending_sync: 0 });

    render(<LogoutButton label="Salir" loadingLabel="..." />);
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));

    await waitFor(() => expect(fakeCaches.store.size).toBe(0));
    expect(signOut).toHaveBeenCalled();
    expect(await db.stats.count()).toBe(0);
  });
});

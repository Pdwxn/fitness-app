import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";

// Give each test file a clean IndexedDB by clearing the Dexie tables between tests.
afterEach(async () => {
  try {
    const { db } = await import("@/lib/db");
    await Promise.all(db.tables.map((table) => table.clear()));
  } catch {
    /* db not opened in this test — ignore */
  }
});

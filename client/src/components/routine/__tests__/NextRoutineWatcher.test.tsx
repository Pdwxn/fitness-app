import { act, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import { useSyncIssuesStore } from "@/store/syncIssuesStore";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() } }));

const { NextRoutineWatcher } = await import("../NextRoutineWatcher");

beforeEach(() => {
  toastError.mockReset();
  useSyncIssuesStore.getState().clearDroppedLogs();
});

describe("NextRoutineWatcher -- dropped logs", () => {
  it("toasts once when a sync drops a log, then clears the count", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <NextRoutineWatcher locale="es" />
      </NextIntlClientProvider>,
    );

    act(() => useSyncIssuesStore.getState().reportDroppedLog());

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no se pudo guardar un registro antiguo/i));
    expect(useSyncIssuesStore.getState().droppedLogCount).toBe(0);
  });

  it("stays quiet when nothing was dropped", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <NextRoutineWatcher locale="es" />
      </NextIntlClientProvider>,
    );

    expect(toastError).not.toHaveBeenCalled();
  });
});

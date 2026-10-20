import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { removeFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type { OnboardingProfile } from "@/types/onboarding";

const authenticatedClientFetch = vi.fn();
vi.mock("@/lib/api/authenticated-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/authenticated-client")>()),
  authenticatedClientFetch: (path: string) => authenticatedClientFetch(path),
}));

const { useBodyVariant } = await import("@/hooks/useBodyVariant");

function profile(overrides: Partial<OnboardingProfile> = {}): OnboardingProfile {
  return {
    full_name: "",
    gender: "male",
    age: null,
    weight_kg: null,
    height_cm: null,
    preferred_language: "es",
    preferred_units: "metric",
    ...overrides,
  };
}

beforeEach(() => {
  authenticatedClientFetch.mockReset();
  removeFromStorage(STORAGE_KEYS.PROFILE);
});

describe("useBodyVariant", () => {
  it("reads 'female' straight from the cached profile", () => {
    setInStorage(STORAGE_KEYS.PROFILE, profile({ gender: "female" }));
    const { result } = renderHook(() => useBodyVariant());
    expect(result.current).toBe("female");
  });

  it("defaults to 'male' for any other gender value, including 'prefer_not_to_say'", () => {
    setInStorage(STORAGE_KEYS.PROFILE, profile({ gender: "prefer_not_to_say" }));
    expect(renderHook(() => useBodyVariant()).result.current).toBe("male");

    setInStorage(STORAGE_KEYS.PROFILE, profile({ gender: "male" }));
    expect(renderHook(() => useBodyVariant()).result.current).toBe("male");
  });

  it("is 'male' and fetches the profile once when nothing is cached yet", async () => {
    authenticatedClientFetch.mockResolvedValue(profile({ gender: "female" }));

    const { result } = renderHook(() => useBodyVariant());
    expect(result.current).toBe("male");

    await waitFor(() => expect(result.current).toBe("female"));
    expect(authenticatedClientFetch).toHaveBeenCalledWith("/api/v1/profile/");
  });
});

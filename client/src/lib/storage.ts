export const STORAGE_KEYS = {
  ROUTINE: "fit_routine_active",
  WEEKLY_VIEW: "fit_routine_weeks",
  DAILY_LOGS: "fit_daily_logs",
  PENDING_SYNC: "fit_pending_sync",
  STATS: "fit_stats_cache",
  LAST_SYNC: "fit_last_sync_ts",
  ONBOARDING_DRAFT: "fit_onboarding_draft",
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function getFromStorage<T>(key: StorageKey): T | null {
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function setInStorage<T>(key: StorageKey, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeFromStorage(key: StorageKey) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key);
}

/** Longest the server waits on Supabase Auth before giving up on one request. */
export const AUTH_TIMEOUT_MS = 4000;

export class AuthTimeoutError extends Error {
  constructor() {
    super("Supabase Auth did not answer in time");
    this.name = "AuthTimeoutError";
  }
}

/**
 * Rejects with `AuthTimeoutError` if `promise` has not settled after `ms`.
 * Used so a slow or unreachable Supabase can never hold a page request (or the
 * middleware, which Vercel kills after ~25 s with a 504) open indefinitely.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = AUTH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuthTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

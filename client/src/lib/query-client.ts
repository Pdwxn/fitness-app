import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/authenticated-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Retrying a 4xx (throttled, unauthorized, not found) can't help and
      // burns through the API's rate limit; only network/server errors retry.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

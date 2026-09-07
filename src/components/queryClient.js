// src/queryClient.js
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 60s — revisiting the page inside that
      // window renders straight from cache, zero network calls.
      staleTime: 60 * 1000,
      // Cache stays in memory for 24h after a query goes unused, so
      // navigating away and back later still shows something instantly
      // while it revalidates in the background.
      gcTime: 24 * 60 * 60 * 1000,
      // Don't hammer the DB on every tab-focus — only refetch if the data
      // is actually stale by then.
      refetchOnWindowFocus: false,
      // Retry once on flaky connections instead of failing immediately.
      retry: 1,
    },
  },
});

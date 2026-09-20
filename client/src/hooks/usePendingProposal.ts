"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPendingProposal } from "@/lib/api/coach";
import { queryKeys } from "@/lib/query-keys";

export function usePendingProposal() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.proposal.pending(),
    queryFn: fetchPendingProposal,
    staleTime: 30_000,
    retry: false,
  });

  return {
    proposal: data ?? null,
    isLoading,
    isError,
    refetch,
  };
}

"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Filters, Vocabulary } from "./filters";
import { apiFetch } from "./api-client";
import type {
  Candidate,
  Me,
  Plan,
  SavedBrief,
  SearchPage,
  SearchResponse,
  ShortlistDetail,
  ShortlistSummary,
} from "./types";

export const keys = {
  me: ["me"] as const,
  plan: ["plan"] as const,
  facets: ["facets"] as const,
  search: (id: string) => ["search", id] as const,
  person: (id: string) => ["person", id] as const,
  shortlists: ["shortlists"] as const,
  shortlist: (id: string) => ["shortlist", id] as const,
  savedBriefs: ["saved-briefs"] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => apiFetch<Me>("/api/me"), staleTime: Infinity });
}

export function usePlan() {
  return useQuery({ queryKey: keys.plan, queryFn: () => apiFetch<Plan>("/api/plan") });
}

export function useFacets() {
  return useQuery({
    queryKey: keys.facets,
    queryFn: () => apiFetch<Vocabulary>("/api/facets"),
    staleTime: Infinity,
  });
}

/** Pages of a stored search. Page 1 is usually already in the cache from useRunSearch. */
export function useSearchResults(searchId: string | null) {
  return useInfiniteQuery({
    queryKey: keys.search(searchId ?? ""),
    enabled: !!searchId,
    queryFn: ({ pageParam }) =>
      apiFetch<SearchPage>(`/api/search/${searchId}?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    staleTime: Infinity, // a search is a snapshot; it never changes
  });
}

export function useRunSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { brief: string; filters?: Filters }) =>
      apiFetch<SearchResponse>("/api/search", { method: "POST", body: input }),
    onSuccess: (res) => {
      const firstPage: SearchPage = {
        search_id: res.search_id,
        brief: res.brief,
        filters: res.filters,
        unsupported: res.unsupported,
        created_at: new Date().toISOString(),
        total: res.total,
        page: 1,
        page_size: res.page_size,
        results: res.results,
      };
      queryClient.setQueryData<InfiniteData<SearchPage, number>>(keys.search(res.search_id), {
        pages: [firstPage],
        pageParams: [1],
      });
      queryClient.setQueryData<Plan>(keys.plan, {
        plan: res.plan,
        searches_remaining: res.searches_remaining,
      });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: keys.plan }),
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: keys.person(id),
    queryFn: () => apiFetch<Candidate>(`/api/people/${encodeURIComponent(id)}`),
    staleTime: Infinity,
  });
}

export function useShortlists() {
  return useQuery({
    queryKey: keys.shortlists,
    queryFn: () => apiFetch<ShortlistSummary[]>("/api/shortlists"),
  });
}

export function useShortlist(id: string) {
  return useQuery({
    queryKey: keys.shortlist(id),
    queryFn: () => apiFetch<ShortlistDetail>(`/api/shortlists/${id}`),
  });
}

export function useCreateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ id: string; name: string }>("/api/shortlists", { method: "POST", body: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.shortlists }),
  });
}

export function useRenameShortlist(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/api/shortlists/${id}`, { method: "PATCH", body: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.shortlists });
      queryClient.invalidateQueries({ queryKey: keys.shortlist(id) });
    },
  });
}

export function useDeleteShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/shortlists/${id}`, { method: "DELETE" }),
    // The detail query is left alone: removing it while its page is still mounted would refetch
    // the list that was just deleted. The page navigates away instead.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.shortlists }),
  });
}

/** Adds or removes a person, updating the lists optimistically so the UI responds instantly. */
export function useToggleShortlistMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shortlistId, personId, add }: { shortlistId: string; personId: string; add: boolean }) =>
      apiFetch(`/api/shortlists/${shortlistId}/people/${encodeURIComponent(personId)}`, {
        method: add ? "POST" : "DELETE",
      }),
    onMutate: async ({ shortlistId, personId, add }) => {
      await queryClient.cancelQueries({ queryKey: keys.shortlists });
      const previous = queryClient.getQueryData<ShortlistSummary[]>(keys.shortlists);
      queryClient.setQueryData<ShortlistSummary[]>(keys.shortlists, (lists) =>
        lists?.map((list) => {
          if (list.id !== shortlistId) return list;
          const has = list.person_ids.includes(personId);
          if (add === has) return list;
          const person_ids = add
            ? [personId, ...list.person_ids]
            : list.person_ids.filter((id) => id !== personId);
          return { ...list, person_ids, count: person_ids.length };
        }),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(keys.shortlists, context.previous);
    },
    onSettled: (_data, _error, { shortlistId }) => {
      queryClient.invalidateQueries({ queryKey: keys.shortlists });
      queryClient.invalidateQueries({ queryKey: keys.shortlist(shortlistId) });
    },
  });
}

export function useSavedBriefs() {
  return useQuery({
    queryKey: keys.savedBriefs,
    queryFn: () => apiFetch<SavedBrief[]>("/api/saved-briefs"),
  });
}

export function useSaveBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { brief: string; filters: Filters }) =>
      apiFetch<SavedBrief>("/api/saved-briefs", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.savedBriefs }),
  });
}

export function useDeleteSavedBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/saved-briefs/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: keys.savedBriefs });
      const previous = queryClient.getQueryData<SavedBrief[]>(keys.savedBriefs);
      queryClient.setQueryData<SavedBrief[]>(keys.savedBriefs, (list) =>
        list?.filter((b) => b.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(keys.savedBriefs, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.savedBriefs }),
  });
}

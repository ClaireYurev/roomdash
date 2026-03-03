"use client";

import useSWR from "swr";
import type { ChecklistEntryWithRoom } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

interface ChecklistResponse {
  date: string;
  entries: ChecklistEntryWithRoom[];
}

export function useChecklist(date?: string) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);

  const { data, error, isLoading, mutate } = useSWR<ChecklistResponse>(
    `/api/checklist?${params.toString()}`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  return {
    date: data?.date ?? date ?? "",
    entries: data?.entries ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

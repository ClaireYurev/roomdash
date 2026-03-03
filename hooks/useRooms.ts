"use client";

import useSWR from "swr";
import type { RoomWithStatus } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

export function useRooms(filter?: string, search?: string) {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (search) params.set("search", search);

  const { data, error, isLoading, mutate } = useSWR<RoomWithStatus[]>(
    `/api/rooms?${params.toString()}`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  return {
    rooms: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

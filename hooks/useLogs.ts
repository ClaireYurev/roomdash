"use client";

import useSWR from "swr";
import type { LogEntry, LogFilters } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useLogs(filters: LogFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });

  const { data, error, isLoading, mutate } = useSWR<LogsResponse>(
    `/api/logs?${params.toString()}`,
    fetcher
  );

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 50,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

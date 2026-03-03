"use client";

import { useState } from "react";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLogs } from "@/hooks/useLogs";
import type { LogFilters, ActionType, ActionResult } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ACTION_TYPES: ActionType[] = [
  "POWER_ON",
  "POWER_OFF",
  "POWER_CYCLE",
  "CHECKLIST_UPDATE",
  "STATUS_POLL",
  "SETTINGS_CHANGE",
];

const RESULTS: ActionResult[] = ["SUCCESS", "FAILURE", "TIMEOUT"];

function resultBadgeClass(result: ActionResult) {
  return {
    SUCCESS: "bg-green-500/15 text-green-500 border-green-500/20",
    FAILURE: "bg-red-500/15 text-red-500 border-red-500/20",
    TIMEOUT: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  }[result];
}

function actionLabel(type: ActionType) {
  return {
    POWER_ON: "Power On",
    POWER_OFF: "Power Off",
    POWER_CYCLE: "Power Cycle",
    CHECKLIST_UPDATE: "Checklist",
    STATUS_POLL: "Status Poll",
    SETTINGS_CHANGE: "Settings",
  }[type];
}

export function LogTable() {
  const [filters, setFilters] = useState<LogFilters>({
    page: 1,
    pageSize: 50,
  });
  const [search, setSearch] = useState("");

  const { logs, total, totalPages, isLoading } = useLogs({
    ...filters,
    search,
  });

  const setFilter = (key: keyof LogFilters, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const buildExportUrl = (format: "csv" | "json") => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.roomId) params.set("roomId", String(filters.roomId));
    if (filters.actionType) params.set("actionType", filters.actionType);
    if (filters.result) params.set("result", filters.result);
    params.set("format", format);
    return `/api/logs/export?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Input
          type="date"
          className="h-9 w-36"
          value={filters.dateFrom || ""}
          onChange={(e) => setFilter("dateFrom", e.target.value || undefined)}
          aria-label="From date"
        />
        <Input
          type="date"
          className="h-9 w-36"
          value={filters.dateTo || ""}
          onChange={(e) => setFilter("dateTo", e.target.value || undefined)}
          aria-label="To date"
        />

        <Select
          value={filters.actionType || "all"}
          onValueChange={(v) => setFilter("actionType", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {actionLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.result || "all"}
          onValueChange={(v) => setFilter("result", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            {RESULTS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" asChild>
            <a href={buildExportUrl("csv")} download>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={buildExportUrl("json")} download>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              JSON
            </a>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
              <TableHead className="hidden lg:table-cell w-24">Duration</TableHead>
              <TableHead className="hidden lg:table-cell">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono whitespace-nowrap">
                    {format(new Date(log.created_at), "MM/dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.room_number ? (
                      <span>
                        <span className="font-mono text-xs">{log.room_number}</span>
                        {" "}
                        <span className="text-muted-foreground hidden sm:inline">
                          {(log as unknown as Record<string, unknown>).room_nickname as string}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {actionLabel(log.action_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", resultBadgeClass(log.result))}
                    >
                      {log.result}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate">
                    {log.details || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                    {log.triggered_by_ip || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>{total} total log entries</span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))
            }
            disabled={!filters.page || filters.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            Page {filters.page || 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                page: Math.min(totalPages, (f.page || 1) + 1),
              }))
            }
            disabled={(filters.page || 1) >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoomCard } from "@/components/RoomCard";
import { useRooms } from "@/hooks/useRooms";
import { useChecklist } from "@/hooks/useChecklist";
import type { ChecklistEntryWithRoom } from "@/types";

const FILTERS = [
  { value: "all", label: "All Rooms" },
  { value: "vip", label: "VIP Only" },
  { value: "has_shelly", label: "Has Shelly" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export function RoomGrid() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [isPolling, setIsPolling] = useState(false);

  const { rooms, isLoading, error, refresh } = useRooms(filter, search);
  const { entries: checklistEntries } = useChecklist();

  const checklistByRoom = checklistEntries.reduce<
    Record<number, ChecklistEntryWithRoom>
  >((acc, entry) => {
    acc[entry.room_id] = entry;
    return acc;
  }, {});

  const pollShellys = async () => {
    setIsPolling(true);
    try {
      await fetch("/api/shelly/poll");
      await refresh();
    } finally {
      setIsPolling(false);
    }
  };

  const vipCount = rooms.filter((r) => r.is_vip).length;
  const onlineCount = rooms.filter(
    (r) => r.shelly_ip && r.shelly_status?.is_online
  ).length;
  const shellyCount = rooms.filter((r) => r.shelly_ip).length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">
          {rooms.length} room{rooms.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="secondary" className="text-green-500 bg-green-500/10">
          {onlineCount}/{shellyCount} online
        </Badge>
        <Badge variant="secondary" className="text-indigo-400 bg-indigo-500/10">
          {vipCount} VIP
        </Badge>
      </div>

      {/* Search + filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={pollShellys}
            disabled={isPolling}
            className="ml-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPolling ? "animate-spin" : ""}`} />
            Poll Shellys
          </Button>
        </div>
      </div>

      {/* Room grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">Failed to load rooms</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No rooms match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              checklist={checklistByRoom[room.id]}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

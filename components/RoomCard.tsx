"use client";

import Link from "next/link";
import { Star, Users, Monitor } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ShellyStatusWidget } from "@/components/ShellyStatusWidget";
import { PowerControls } from "@/components/PowerControls";
import type { RoomWithStatus, ChecklistEntryWithRoom } from "@/types";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  room: RoomWithStatus;
  checklist?: ChecklistEntryWithRoom;
  onRefresh?: () => void;
}

function ChecklistMini({ entry }: { entry: ChecklistEntryWithRoom | undefined }) {
  if (!entry) return null;
  const steps = [
    { key: "step_checked", label: "Checked" },
    { key: "step_prepped", label: "Prepped" },
    { key: "step_cycled", label: "Cycled" },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      {steps.map(({ key, label }) => (
        <span
          key={key}
          className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            entry[key]
              ? "bg-green-500/15 text-green-500"
              : "bg-muted text-muted-foreground"
          )}
        >
          {entry[key] ? "✓" : "○"} {label}
        </span>
      ))}
    </div>
  );
}

export function RoomCard({ room, checklist, onRefresh }: RoomCardProps) {
  const isVip = room.is_vip;
  const hasShelly = !!room.shelly_ip;
  const avEquipment = Array.isArray(room.av_equipment)
    ? room.av_equipment
    : [];

  const seatsLabel =
    room.official_seats != null && room.max_seats != null
      ? `${room.official_seats} / ${room.max_seats}`
      : room.official_seats != null
      ? `${room.official_seats}`
      : room.max_seats != null
      ? `Max ${room.max_seats}`
      : null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        isVip && "border-indigo-500/30 dark:border-indigo-500/40"
      )}
    >
      {isVip && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
      )}
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/rooms/${room.id}`}
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              <h3 className="font-bold text-lg leading-tight truncate">
                {room.nickname}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                Room {room.room_number}
              </p>
            </Link>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isVip && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 text-xs">
                <Star className="w-2.5 h-2.5 mr-0.5" />
                VIP
              </Badge>
            )}
            {!room.is_bookable && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Non-bookable
              </Badge>
            )}
            {room.bookable_method === "manual" && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Manual
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Status row */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge
            shellyIp={room.shelly_ip}
            shellyStatus={room.shelly_status}
            showWatts
          />
          {seatsLabel && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {seatsLabel}
            </span>
          )}
        </div>

        {/* AV Equipment */}
        {avEquipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Monitor className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            {avEquipment.map((eq) => (
              <Badge
                key={eq}
                variant="secondary"
                className="text-xs px-1.5 py-0 font-normal"
              >
                {eq}
              </Badge>
            ))}
          </div>
        )}

        {/* Shelly status (compact) */}
        {hasShelly && (
          <ShellyStatusWidget
            shellyStatus={room.shelly_status}
            shellyIp={room.shelly_ip}
            compact
          />
        )}

        {/* Checklist mini status (VIP only) */}
        {isVip && <ChecklistMini entry={checklist} />}

        {/* Power controls (VIP + Shelly only) */}
        {isVip && hasShelly && (
          <div className="pt-1 border-t border-border/50">
            <PowerControls room={room} onSuccess={onRefresh} />
          </div>
        )}

        {/* Notes */}
        {room.notes && (
          <p className="text-xs text-muted-foreground italic truncate">
            {room.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { OnlineStatus } from "@/types";
import type { ShellyStatus } from "@/types";

interface StatusBadgeProps {
  shellyIp: string | null;
  shellyStatus: ShellyStatus | null;
  className?: string;
  showWatts?: boolean;
}

export function getOnlineStatus(
  shellyIp: string | null,
  shellyStatus: ShellyStatus | null
): OnlineStatus {
  if (!shellyIp) return "no_shelly";
  if (!shellyStatus || !shellyStatus.last_polled) return "offline";
  if (!shellyStatus.is_online) return "offline";
  // Degraded: online but output off or near-zero power when expected to be on
  if (shellyStatus.output_on && shellyStatus.watts !== null && shellyStatus.watts < 1) {
    return "degraded";
  }
  return "online";
}

const statusConfig: Record<
  OnlineStatus,
  { dot: string; label: string; text: string }
> = {
  online: {
    dot: "bg-green-500",
    label: "Online",
    text: "text-green-500",
  },
  offline: {
    dot: "bg-red-500",
    label: "Offline",
    text: "text-red-500",
  },
  degraded: {
    dot: "bg-amber-500",
    label: "Degraded",
    text: "text-amber-500",
  },
  no_shelly: {
    dot: "bg-slate-400",
    label: "No Shelly",
    text: "text-slate-400",
  },
};

export function StatusBadge({
  shellyIp,
  shellyStatus,
  className,
  showWatts = true,
}: StatusBadgeProps) {
  const status = getOnlineStatus(shellyIp, shellyStatus);
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block w-2.5 h-2.5 rounded-full flex-shrink-0",
          config.dot,
          status === "online" && "animate-pulse"
        )}
      />
      <span className={cn("text-xs font-medium", config.text)}>
        {config.label}
        {showWatts &&
          status === "online" &&
          shellyStatus?.watts != null &&
          ` · ${shellyStatus.watts.toFixed(1)}W`}
      </span>
    </div>
  );
}

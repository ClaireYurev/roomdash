"use client";

import { Zap, Thermometer, Activity } from "lucide-react";
import type { ShellyStatus } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ShellyStatusWidgetProps {
  shellyStatus: ShellyStatus | null;
  shellyIp: string | null;
  compact?: boolean;
}

export function ShellyStatusWidget({
  shellyStatus,
  shellyIp,
  compact = false,
}: ShellyStatusWidgetProps) {
  if (!shellyIp) {
    return (
      <p className="text-xs text-muted-foreground">No Shelly plug configured</p>
    );
  }

  if (!shellyStatus || !shellyStatus.last_polled) {
    return (
      <p className="text-xs text-muted-foreground">
        Not yet polled · {shellyIp}
      </p>
    );
  }

  const wattsColor =
    shellyStatus.watts == null
      ? "text-muted-foreground"
      : shellyStatus.watts > 20
      ? "text-green-500"
      : shellyStatus.watts > 1
      ? "text-amber-500"
      : "text-slate-400";

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {shellyStatus.watts != null && (
          <span className={cn("flex items-center gap-0.5 font-medium", wattsColor)}>
            <Zap className="w-3 h-3" />
            {shellyStatus.watts.toFixed(1)}W
          </span>
        )}
        {shellyStatus.last_polled && (
          <span>
            {formatDistanceToNow(new Date(shellyStatus.last_polled), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col items-center p-2 rounded bg-muted/50">
          <Zap className={cn("w-4 h-4 mb-0.5", wattsColor)} />
          <span className={cn("font-semibold", wattsColor)}>
            {shellyStatus.watts != null ? `${shellyStatus.watts.toFixed(1)}W` : "—"}
          </span>
          <span className="text-muted-foreground">Power</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded bg-muted/50">
          <Activity className="w-4 h-4 mb-0.5 text-blue-400" />
          <span className="font-semibold">
            {shellyStatus.voltage != null
              ? `${shellyStatus.voltage.toFixed(0)}V`
              : "—"}
          </span>
          <span className="text-muted-foreground">Voltage</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded bg-muted/50">
          <Thermometer className="w-4 h-4 mb-0.5 text-orange-400" />
          <span className="font-semibold">
            {shellyStatus.temperature_c != null
              ? `${shellyStatus.temperature_c.toFixed(0)}°C`
              : "—"}
          </span>
          <span className="text-muted-foreground">Temp</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        IP: {shellyIp} ·{" "}
        {shellyStatus.last_polled
          ? `Last polled ${formatDistanceToNow(new Date(shellyStatus.last_polled), {
              addSuffix: true,
            })}`
          : "Never polled"}
      </p>
    </div>
  );
}

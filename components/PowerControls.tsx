"use client";

import { useState, useEffect } from "react";
import { Power, PowerOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { RoomWithStatus } from "@/types";

const CYCLE_COOLDOWN_SECONDS = 60;

interface PowerControlsProps {
  room: RoomWithStatus;
  onSuccess?: () => void;
  compact?: boolean;
}

type PendingAction = "on" | "off" | "cycle" | null;

export function PowerControls({ room, onSuccess, compact = false }: PowerControlsProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleAction = async (action: "on" | "off" | "cycle") => {
    setPending(null);
    setLoading(true);
    try {
      const res = await fetch("/api/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, action }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `${room.nickname}: Power ${action === "cycle" ? "cycled" : action === "on" ? "turned on" : "turned off"} successfully`,
          { description: data.durationMs ? `Completed in ${data.durationMs}ms` : undefined }
        );
        if (action === "cycle") setCooldown(CYCLE_COOLDOWN_SECONDS);
        onSuccess?.();
      } else {
        toast.error(`Failed to power ${action} ${room.nickname}`, {
          description: data.error,
        });
      }
    } catch {
      toast.error(`Network error while powering ${action} ${room.nickname}`);
    } finally {
      setLoading(false);
    }
  };

  const actionLabels = {
    on: { title: "Turn On", description: `Turn on the power to ${room.nickname} (Room ${room.room_number})?` },
    off: { title: "Turn Off", description: `Turn off the power to ${room.nickname} (Room ${room.room_number})? This will shut down all connected AV equipment.` },
    cycle: { title: "Power Cycle", description: `Power cycle ${room.nickname} (Room ${room.room_number})? The device will be off for ~5 seconds, then turned back on.` },
  };

  const btnSize = compact ? "sm" : "sm";

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size={btnSize}
          className="text-green-600 border-green-600/30 hover:bg-green-500/10 hover:text-green-500"
          onClick={() => setPending("on")}
          disabled={loading}
          aria-label={`Turn on ${room.nickname}`}
        >
          <Power className="w-3.5 h-3.5" />
          {!compact && <span className="ml-1">On</span>}
        </Button>
        <Button
          variant="outline"
          size={btnSize}
          className="text-red-500 border-red-500/30 hover:bg-red-500/10"
          onClick={() => setPending("off")}
          disabled={loading}
          aria-label={`Turn off ${room.nickname}`}
        >
          <PowerOff className="w-3.5 h-3.5" />
          {!compact && <span className="ml-1">Off</span>}
        </Button>
        <Button
          variant="outline"
          size={btnSize}
          className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
          onClick={() => setPending("cycle")}
          disabled={loading || cooldown > 0}
          aria-label={`Power cycle ${room.nickname}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading && pending === "cycle" ? "animate-spin" : ""}`} />
          {!compact && (
            <span className="ml-1">
              {cooldown > 0 ? `${cooldown}s` : "Cycle"}
            </span>
          )}
        </Button>
        {compact && cooldown > 0 && (
          <span className="text-xs text-amber-500 font-medium">
            {cooldown}s cooldown
          </span>
        )}
      </div>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending && actionLabels[pending].title}</DialogTitle>
            <DialogDescription>
              {pending && actionLabels[pending].description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pending && handleAction(pending)}
              disabled={loading}
              className={
                pending === "off"
                  ? "bg-red-500 hover:bg-red-600"
                  : pending === "cycle"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : ""
              }
            >
              {loading ? "Working..." : pending === "on" ? "Turn On" : pending === "off" ? "Turn Off" : "Cycle Power"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

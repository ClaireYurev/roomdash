"use client";

import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useChecklist } from "@/hooks/useChecklist";
import type { ChecklistEntryWithRoom } from "@/types";
import { cn } from "@/lib/utils";

interface ChecklistRowProps {
  entry: ChecklistEntryWithRoom;
  onUpdate: () => void;
}

const STEPS = [
  { key: "step_checked" as const, label: "Checked", description: "Physically visited, hardware present" },
  { key: "step_prepped" as const, label: "Prepped", description: "TV on, Tap home screen, test call OK" },
  { key: "step_cycled" as const, label: "Power Cycled", description: "NUC rebooted via Shelly or manually" },
];

function ChecklistRow({ entry, onUpdate }: ChecklistRowProps) {
  const [completedBy, setCompletedBy] = useState(entry.completed_by || "");
  const [notes, setNotes] = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);
  const [isCycling, setIsCycling] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const allDone = entry.step_checked && entry.step_prepped && entry.step_cycled;

  const updateStep = async (step: keyof typeof entry, value: boolean) => {
    setSaving(true);
    try {
      await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: entry.room_id,
          date: entry.checklist_date,
          [step]: value,
          completed_by: completedBy || null,
        }),
      });
      onUpdate();
    } catch {
      toast.error("Failed to update checklist");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: entry.room_id,
          date: entry.checklist_date,
          notes,
          completed_by: completedBy || null,
        }),
      });
      toast.success("Notes saved");
      onUpdate();
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const powerCycle = async () => {
    setIsCycling(true);
    try {
      const res = await fetch("/api/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: entry.room_id, action: "cycle" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${entry.room_nickname}: Power cycled successfully`);
        // Auto-check the cycled step
        await updateStep("step_cycled", true);
      } else {
        toast.error(`Power cycle failed: ${data.error}`);
      }
    } catch {
      toast.error("Network error during power cycle");
    } finally {
      setIsCycling(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3 transition-colors",
        allDone ? "border-green-500/30 bg-green-500/5" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{entry.room_nickname}</h3>
          <p className="text-xs text-muted-foreground">Room {entry.room_number}</p>
        </div>
        {allDone && (
          <span className="text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
            Complete
          </span>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map(({ key, label, description }) => (
          <div key={key} className="flex items-start gap-2.5">
            <Checkbox
              id={`${entry.room_id}-${key}`}
              checked={entry[key]}
              onCheckedChange={(checked) => updateStep(key, !!checked)}
              disabled={saving}
              className="mt-0.5"
            />
            <Label
              htmlFor={`${entry.room_id}-${key}`}
              className={cn(
                "text-sm cursor-pointer leading-snug",
                entry[key] && "line-through text-muted-foreground"
              )}
            >
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground"> — {description}</span>
            </Label>
          </div>
        ))}
      </div>

      {/* Power cycle shortcut */}
      <Button
        variant="outline"
        size="sm"
        onClick={powerCycle}
        disabled={isCycling || today !== entry.checklist_date}
        className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
      >
        <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isCycling && "animate-spin")} />
        {isCycling ? "Cycling..." : "Power Cycle Now"}
      </Button>

      {/* Completed by + Notes */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            placeholder="Completed by (name/initials)"
            value={completedBy}
            onChange={(e) => setCompletedBy(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
          <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving} className="self-end">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChecklistPanel() {
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const { entries, isLoading, refresh } = useChecklist();

  const completedCount = entries.filter(
    (e) => e.step_checked && e.step_prepped && e.step_cycled
  ).length;
  const totalCount = entries.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const markAllComplete = async () => {
    setShowConfirmAll(false);
    const now = new Date().toISOString();
    await Promise.all(
      entries.map((entry) =>
        fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: entry.room_id,
            date: today,
            step_checked: true,
            step_prepped: true,
            step_cycled: true,
          }),
        })
      )
    );
    toast.success("All rooms marked complete");
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Daily Checklist — {format(new Date(today), "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {completedCount} / {totalCount} VIP rooms completed
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirmAll(true)}
            disabled={completedCount === totalCount}
          >
            Mark All Complete
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Room rows */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ChecklistRow key={entry.room_id} entry={entry} onUpdate={refresh} />
          ))}
        </div>
      )}

      {/* Confirm all dialog */}
      <Dialog open={showConfirmAll} onOpenChange={setShowConfirmAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark All Rooms Complete?</DialogTitle>
            <DialogDescription>
              This will mark all {totalCount} VIP rooms as checked, prepped, and
              power cycled. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmAll(false)}>
              Cancel
            </Button>
            <Button onClick={markAllComplete}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

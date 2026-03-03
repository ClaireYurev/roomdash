"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, TestTube, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Room, AppSettings } from "@/types";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [testResult, setTestResult] = useState<Record<number, string>>({});
  const [newRoom, setNewRoom] = useState<Partial<Room>>({});
  const [showAddRoom, setShowAddRoom] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch("/api/rooms?filter=all");
      const data = await res.json();
      setRooms(data);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings({
        shelly_poll_interval_ms: parseInt(data.shelly_poll_interval_ms, 10),
        shelly_timeout_ms: parseInt(data.shelly_timeout_ms, 10),
        log_retention_days: parseInt(data.log_retention_days, 10),
        dashboard_refresh_interval_ms: parseInt(
          data.dashboard_refresh_interval_ms,
          10
        ),
        checklist_reset_time: data.checklist_reset_time,
        default_completed_by: data.default_completed_by,
        app_display_name: data.app_display_name,
        timezone: data.timezone,
      });
    } catch {
      toast.error("Failed to load settings");
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchSettings();
  }, [fetchRooms, fetchSettings]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const testShelly = async (room: Room) => {
    if (!room.shelly_ip) return;
    setTestResult((prev) => ({ ...prev, [room.id]: "Testing..." }));
    try {
      const start = Date.now();
      const res = await fetch(
        `/api/shelly/poll`
      );
      const data = await res.json();
      const roomResult = data.results?.find(
        (r: Record<string, unknown>) => r.roomId === room.id
      );
      if (roomResult?.isOnline) {
        setTestResult((prev) => ({
          ...prev,
          [room.id]: `Online · ${roomResult.watts?.toFixed(1) ?? "?"}W · ${Date.now() - start}ms`,
        }));
      } else {
        setTestResult((prev) => ({
          ...prev,
          [room.id]: "Offline / unreachable",
        }));
      }
    } catch {
      setTestResult((prev) => ({ ...prev, [room.id]: "Error" }));
    }
  };

  const deleteRoom = async (room: Room) => {
    try {
      await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
      toast.success(`${room.nickname} removed`);
      setDeleteTarget(null);
      fetchRooms();
    } catch {
      toast.error("Failed to delete room");
    }
  };

  const addRoom = async () => {
    if (!newRoom.room_number || !newRoom.nickname) {
      toast.error("Room number and nickname are required");
      return;
    }
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoom),
      });
      toast.success("Room added");
      setShowAddRoom(false);
      setNewRoom({});
      fetchRooms();
    } catch {
      toast.error("Failed to add room");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure rooms, Shelly devices, and system preferences
        </p>
      </div>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="shelly">Shelly</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {rooms.length} active room{rooms.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" onClick={() => setShowAddRoom(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Room
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Shelly IP</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRooms ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{room.nickname}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {room.room_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {room.official_seats ?? "—"}
                        {room.max_seats ? ` / ${room.max_seats}` : ""}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {room.shelly_ip ? (
                          <div className="space-y-0.5">
                            <p>{room.shelly_ip}</p>
                            {testResult[room.id] && (
                              <p className="text-muted-foreground">
                                {testResult[room.id]}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {room.is_vip && (
                            <Badge className="text-xs bg-indigo-500/15 text-indigo-400 border-indigo-500/20">
                              VIP
                            </Badge>
                          )}
                          {room.is_bookable && (
                            <Badge variant="secondary" className="text-xs">
                              Bookable
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {room.shelly_ip && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => testShelly(room)}
                              title="Test Shelly connection"
                            >
                              <TestTube className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(room)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Shelly Tab */}
        <TabsContent value="shelly" className="space-y-1">
          <SettingRow
            label="Poll Interval"
            description="How often to check Shelly device status"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-8 w-24 text-sm"
                value={(settings.shelly_poll_interval_ms || 30000) / 1000}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    shelly_poll_interval_ms: parseInt(e.target.value, 10) * 1000,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow
            label="Request Timeout"
            description="Max wait time for each Shelly device response"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-8 w-24 text-sm"
                value={(settings.shelly_timeout_ms || 3000) / 1000}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    shelly_timeout_ms: parseInt(e.target.value, 10) * 1000,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </SettingRow>
          <Separator />
          <div className="pt-3">
            <Button
              variant="outline"
              onClick={async () => {
                toast.info("Polling all Shelly devices...");
                const res = await fetch("/api/shelly/poll");
                const data = await res.json();
                toast.success(
                  `Polled ${data.polled} device${data.polled !== 1 ? "s" : ""}`
                );
              }}
            >
              <TestTube className="w-4 h-4 mr-2" />
              Ping All Shellys
            </Button>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-1">
          <SettingRow
            label="Checklist Reset Time"
            description="Time each day when the checklist resets"
          >
            <Input
              type="time"
              className="h-8 w-28 text-sm"
              value={settings.checklist_reset_time || "06:00"}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  checklist_reset_time: e.target.value,
                }))
              }
            />
          </SettingRow>
          <Separator />
          <SettingRow
            label="Default Completed By"
            description="Pre-fill staff name/initials on checklist"
          >
            <Input
              className="h-8 w-40 text-sm"
              placeholder="e.g. JS"
              value={settings.default_completed_by || ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  default_completed_by: e.target.value,
                }))
              }
            />
          </SettingRow>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-1">
          <SettingRow
            label="App Display Name"
            description="Shown in the browser tab and header"
          >
            <Input
              className="h-8 w-40 text-sm"
              value={settings.app_display_name || "RoomDash"}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  app_display_name: e.target.value,
                }))
              }
            />
          </SettingRow>
          <Separator />
          <SettingRow
            label="Log Retention"
            description="Automatically delete logs older than this many days"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-8 w-20 text-sm"
                value={settings.log_retention_days || 90}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    log_retention_days: parseInt(e.target.value, 10),
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow
            label="Dashboard Refresh"
            description="How often room cards auto-refresh"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-8 w-24 text-sm"
                value={
                  (settings.dashboard_refresh_interval_ms || 30000) / 1000
                }
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    dashboard_refresh_interval_ms:
                      parseInt(e.target.value, 10) * 1000,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow label="Time Zone" description="Used for log timestamps">
            <Input
              className="h-8 w-48 text-sm font-mono"
              value={settings.timezone || "America/Los_Angeles"}
              onChange={(e) =>
                setSettings((s) => ({ ...s, timezone: e.target.value }))
              }
            />
          </SettingRow>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <div className="flex justify-end border-t pt-4">
        <Button onClick={saveSettings} disabled={savingSettings}>
          <Save className="w-4 h-4 mr-2" />
          {savingSettings ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Room?</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <strong>
                {deleteTarget?.nickname} (Room {deleteTarget?.room_number})
              </strong>{" "}
              from the dashboard? This action can be undone by re-adding the room.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteRoom(deleteTarget)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add room dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Room Number *</Label>
                <Input
                  placeholder="e.g. 195"
                  value={newRoom.room_number || ""}
                  onChange={(e) =>
                    setNewRoom((r) => ({ ...r, room_number: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Nickname *</Label>
                <Input
                  placeholder="e.g. Sunset"
                  value={newRoom.nickname || ""}
                  onChange={(e) =>
                    setNewRoom((r) => ({ ...r, nickname: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Official Seats</Label>
                <Input
                  type="number"
                  value={newRoom.official_seats || ""}
                  onChange={(e) =>
                    setNewRoom((r) => ({
                      ...r,
                      official_seats: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Max Seats</Label>
                <Input
                  type="number"
                  value={newRoom.max_seats || ""}
                  onChange={(e) =>
                    setNewRoom((r) => ({
                      ...r,
                      max_seats: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Shelly IP Address</Label>
              <Input
                placeholder="192.168.1.108"
                value={newRoom.shelly_ip || ""}
                onChange={(e) =>
                  setNewRoom((r) => ({ ...r, shelly_ip: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRoom.is_vip || false}
                  onCheckedChange={(v) =>
                    setNewRoom((r) => ({ ...r, is_vip: v }))
                  }
                />
                <Label>VIP Room</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRoom.is_bookable !== false}
                  onCheckedChange={(v) =>
                    setNewRoom((r) => ({ ...r, is_bookable: v }))
                  }
                />
                <Label>Bookable</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoom(false)}>
              Cancel
            </Button>
            <Button onClick={addRoom}>Add Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

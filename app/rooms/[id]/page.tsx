"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Users, Monitor, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { ShellyStatusWidget } from "@/components/ShellyStatusWidget";
import { PowerControls } from "@/components/PowerControls";
import type { RoomWithStatus } from "@/types";

export default function RoomDetailPage() {
  const { id } = useParams();
  const [room, setRoom] = useState<RoomWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) throw new Error("Room not found");
      const data = await res.json();
      setRoom(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 30_000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-destructive font-medium mb-4">{error || "Room not found"}</p>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const avEquipment = Array.isArray(room.av_equipment) ? room.av_equipment : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          All Rooms
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{room.nickname}</h1>
            {room.is_vip && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0">
                <Star className="w-3 h-3 mr-1" />
                VIP
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground font-mono">Room {room.room_number}</p>
        </div>
        <StatusBadge
          shellyIp={room.shelly_ip}
          shellyStatus={room.shelly_status}
          showWatts
        />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {room.official_seats != null || room.max_seats != null ? (
              <p className="text-2xl font-bold">
                {room.official_seats ?? "?"}
                {room.max_seats != null && (
                  <span className="text-muted-foreground text-lg"> / {room.max_seats}</span>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground">Not specified</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">Official / Max seats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wifi className="w-4 h-4" />
              Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium capitalize">
              {room.is_bookable ? room.bookable_method : "Not bookable"}
            </p>
            {room.outlook_email && (
              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                {room.outlook_email}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AV Equipment */}
      {avEquipment.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              AV Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {avEquipment.map((eq) => (
                <Badge key={eq} variant="secondary">
                  {eq}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shelly Status */}
      {room.shelly_ip && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shelly Plug Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShellyStatusWidget
              shellyStatus={room.shelly_status}
              shellyIp={room.shelly_ip}
            />
            {room.is_vip && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Power Controls</p>
                  <PowerControls room={room} onSuccess={fetchRoom} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {room.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground italic">{room.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

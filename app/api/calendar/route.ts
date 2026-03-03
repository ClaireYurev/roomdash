import { NextRequest, NextResponse } from "next/server";
import { getTodayEvents, isGraphConfigured } from "@/lib/graph";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    if (!isGraphConfigured()) {
      return NextResponse.json({
        configured: false,
        events: {},
        message: "Microsoft Graph API not configured",
      });
    }

    const db = getDb();
    const rooms = db
      .prepare(
        "SELECT id, room_number, nickname, outlook_email FROM rooms WHERE outlook_email IS NOT NULL AND is_active = 1"
      )
      .all() as {
      id: number;
      room_number: string;
      nickname: string;
      outlook_email: string;
    }[];

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const targetRooms = roomId
      ? rooms.filter((r) => r.id === parseInt(roomId, 10))
      : rooms;

    const results = await Promise.allSettled(
      targetRooms.map(async (room) => {
        const events = await getTodayEvents(room.outlook_email);
        return { roomId: room.id, events };
      })
    );

    const eventsByRoom: Record<number, unknown[]> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        eventsByRoom[targetRooms[i].id] = r.value.events;
      } else {
        eventsByRoom[targetRooms[i].id] = [];
      }
    });

    return NextResponse.json({ configured: true, events: eventsByRoom });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Room, ShellyStatus } from "@/types";

function parseRoom(row: Record<string, unknown>): Room {
  return {
    ...(row as Omit<Room, "av_equipment" | "is_vip" | "is_bookable" | "is_active">),
    av_equipment: JSON.parse((row.av_equipment as string) || "[]"),
    is_vip: Boolean(row.is_vip),
    is_bookable: Boolean(row.is_bookable),
    is_active: Boolean(row.is_active),
  } as Room;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";

    let query = `
      SELECT r.*, s.is_online, s.output_on, s.watts, s.voltage, s.temperature_c,
             s.last_polled, s.last_seen_online
      FROM rooms r
      LEFT JOIN shelly_status s ON s.room_id = r.id
      WHERE r.is_active = 1
    `;
    const params: (string | number)[] = [];

    if (filter === "vip") {
      query += " AND r.is_vip = 1";
    } else if (filter === "has_shelly") {
      query += " AND r.shelly_ip IS NOT NULL";
    }

    if (search) {
      query += " AND (r.nickname LIKE ? OR r.room_number LIKE ? OR r.notes LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += " ORDER BY r.is_vip DESC, r.room_number ASC";

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

    const rooms = rows.map((row) => {
      const room = parseRoom(row);
      const shellyStatus: ShellyStatus | null = row.last_polled
        ? {
            room_id: row.id as number,
            is_online: Boolean(row.is_online),
            output_on: Boolean(row.output_on),
            watts: (row.watts as number) ?? null,
            voltage: (row.voltage as number) ?? null,
            temperature_c: (row.temperature_c as number) ?? null,
            last_polled: row.last_polled as string,
            last_seen_online: (row.last_seen_online as string) ?? null,
          }
        : null;
      return { ...room, shelly_status: shellyStatus };
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      room_number,
      nickname,
      official_seats,
      max_seats,
      av_equipment = [],
      shelly_ip,
      outlook_email,
      is_vip = false,
      is_bookable = true,
      bookable_method = "outlook",
      notes,
    } = body;

    if (!room_number || !nickname) {
      return NextResponse.json(
        { error: "room_number and nickname are required" },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      INSERT INTO rooms (room_number, nickname, official_seats, max_seats, av_equipment,
        shelly_ip, outlook_email, is_vip, is_bookable, bookable_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      room_number,
      nickname,
      official_seats ?? null,
      max_seats ?? null,
      JSON.stringify(av_equipment),
      shelly_ip ?? null,
      outlook_email ?? null,
      is_vip ? 1 : 0,
      is_bookable ? 1 : 0,
      bookable_method,
      notes ?? null
    );

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}

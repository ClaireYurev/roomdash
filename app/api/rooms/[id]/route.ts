import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT r.*, s.is_online, s.output_on, s.watts, s.voltage, s.temperature_c,
                s.last_polled, s.last_seen_online
         FROM rooms r
         LEFT JOIN shelly_status s ON s.room_id = r.id
         WHERE r.id = ? AND r.is_active = 1`
      )
      .get(params.id) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const room = {
      ...row,
      av_equipment: JSON.parse((row.av_equipment as string) || "[]"),
      is_vip: Boolean(row.is_vip),
      is_bookable: Boolean(row.is_bookable),
      is_active: Boolean(row.is_active),
      shelly_status: row.last_polled
        ? {
            room_id: row.id,
            is_online: Boolean(row.is_online),
            output_on: Boolean(row.output_on),
            watts: row.watts ?? null,
            voltage: row.voltage ?? null,
            temperature_c: row.temperature_c ?? null,
            last_polled: row.last_polled,
            last_seen_online: row.last_seen_online ?? null,
          }
        : null,
    };

    return NextResponse.json(room);
  } catch (error) {
    console.error("GET /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      room_number,
      nickname,
      official_seats,
      max_seats,
      av_equipment,
      shelly_ip,
      outlook_email,
      is_vip,
      is_bookable,
      bookable_method,
      notes,
    } = body;

    db.prepare(
      `UPDATE rooms SET
        room_number = COALESCE(?, room_number),
        nickname = COALESCE(?, nickname),
        official_seats = ?,
        max_seats = ?,
        av_equipment = COALESCE(?, av_equipment),
        shelly_ip = ?,
        outlook_email = ?,
        is_vip = COALESCE(?, is_vip),
        is_bookable = COALESCE(?, is_bookable),
        bookable_method = COALESCE(?, bookable_method),
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(
      room_number ?? null,
      nickname ?? null,
      official_seats ?? null,
      max_seats ?? null,
      av_equipment !== undefined ? JSON.stringify(av_equipment) : null,
      shelly_ip ?? null,
      outlook_email ?? null,
      is_vip !== undefined ? (is_vip ? 1 : 0) : null,
      is_bookable !== undefined ? (is_bookable ? 1 : 0) : null,
      bookable_method ?? null,
      notes ?? null,
      params.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const db = getDb();
    db.prepare("UPDATE rooms SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(
      params.id
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getShellyStatus } from "@/lib/shelly";
import { logAction } from "@/lib/logger";

export async function GET() {
  try {
    const db = getDb();
    const rooms = db
      .prepare(
        "SELECT id, room_number, nickname, shelly_ip FROM rooms WHERE shelly_ip IS NOT NULL AND is_active = 1"
      )
      .all() as {
      id: number;
      room_number: string;
      nickname: string;
      shelly_ip: string;
    }[];

    const results = await Promise.allSettled(
      rooms.map(async (room) => {
        const { data, durationMs, error, timedOut } = await getShellyStatus(
          room.shelly_ip
        );

        const now = new Date().toISOString();
        const isOnline = !!data;

        if (data) {
          db.prepare(`
            INSERT INTO shelly_status (room_id, is_online, output_on, watts, voltage, temperature_c, last_polled, last_seen_online)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(room_id) DO UPDATE SET
              is_online = 1, output_on = excluded.output_on, watts = excluded.watts,
              voltage = excluded.voltage, temperature_c = excluded.temperature_c,
              last_polled = excluded.last_polled, last_seen_online = excluded.last_seen_online
          `).run(
            room.id,
            data.output ? 1 : 0,
            data.apower,
            data.voltage,
            data.temperature.tC,
            now,
            now
          );
        } else {
          db.prepare(`
            INSERT INTO shelly_status (room_id, is_online, output_on, watts, voltage, temperature_c, last_polled)
            VALUES (?, 0, 0, NULL, NULL, NULL, ?)
            ON CONFLICT(room_id) DO UPDATE SET
              is_online = 0, last_polled = excluded.last_polled
          `).run(room.id, now);
        }

        logAction({
          roomId: room.id,
          actionType: "STATUS_POLL",
          result: isOnline ? "SUCCESS" : timedOut ? "TIMEOUT" : "FAILURE",
          details: data
            ? `Online. Output: ${data.output}, Power: ${data.apower}W`
            : `Offline. ${error || "No response"}`,
          durationMs,
        });

        return {
          roomId: room.id,
          roomNumber: room.room_number,
          nickname: room.nickname,
          isOnline,
          watts: data?.apower ?? null,
          durationMs,
          error: error ?? null,
        };
      })
    );

    const summary = results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: String(r.reason) }
    );

    return NextResponse.json({ polled: rooms.length, results: summary });
  } catch (error) {
    console.error("GET /api/shelly/poll error:", error);
    return NextResponse.json(
      { error: "Failed to poll Shelly devices" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getShellyStatus,
  setShellyOutput,
  powerCycleShelly,
} from "@/lib/shelly";
import { logAction } from "@/lib/logger";
import type { PowerAction } from "@/types";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  try {
    const body = await request.json();
    const { roomId, action }: { roomId: number; action: PowerAction } = body;

    if (!roomId || !action) {
      return NextResponse.json(
        { error: "roomId and action are required" },
        { status: 400 }
      );
    }

    if (!["on", "off", "cycle"].includes(action)) {
      return NextResponse.json(
        { error: "action must be on, off, or cycle" },
        { status: 400 }
      );
    }

    const db = getDb();
    const room = db
      .prepare("SELECT * FROM rooms WHERE id = ? AND is_active = 1")
      .get(roomId) as Record<string, unknown> | undefined;

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.shelly_ip) {
      return NextResponse.json(
        { error: "Room has no Shelly plug configured" },
        { status: 400 }
      );
    }

    const ip = room.shelly_ip as string;
    const actionTypeMap = {
      on: "POWER_ON",
      off: "POWER_OFF",
      cycle: "POWER_CYCLE",
    } as const;

    let result;
    if (action === "cycle") {
      result = await powerCycleShelly(ip);
    } else {
      result = await setShellyOutput(ip, action === "on");
    }

    const actionType = actionTypeMap[action];
    const actionResult = result.success ? "SUCCESS" : "FAILURE";

    logAction({
      roomId,
      actionType,
      result: actionResult,
      details: result.success
        ? `Power ${action} command sent successfully`
        : `Failed: ${result.error}`,
      triggeredByIp: clientIp,
      durationMs: result.durationMs,
    });

    if (result.success) {
      // Refresh Shelly status after action
      const status = await getShellyStatus(ip);
      if (status.data) {
        db.prepare(`
          INSERT INTO shelly_status (room_id, is_online, output_on, watts, voltage, temperature_c, last_polled, last_seen_online)
          VALUES (?, 1, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(room_id) DO UPDATE SET
            is_online = 1, output_on = excluded.output_on, watts = excluded.watts,
            voltage = excluded.voltage, temperature_c = excluded.temperature_c,
            last_polled = excluded.last_polled, last_seen_online = excluded.last_seen_online
        `).run(
          roomId,
          status.data.output ? 1 : 0,
          status.data.apower,
          status.data.voltage,
          status.data.temperature.tC
        );
      }
    }

    return NextResponse.json({
      success: result.success,
      durationMs: result.durationMs,
      error: result.error,
    });
  } catch (error) {
    console.error("POST /api/power error:", error);
    logAction({
      actionType: "POWER_ON",
      result: "FAILURE",
      details: `Unexpected error: ${error}`,
      triggeredByIp: clientIp,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

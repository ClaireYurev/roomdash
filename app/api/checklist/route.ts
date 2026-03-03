import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logAction } from "@/lib/logger";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Ensure checklist entries exist for all VIP rooms on this date
    const vipRooms = db
      .prepare("SELECT id FROM rooms WHERE is_vip = 1 AND is_active = 1")
      .all() as { id: number }[];

    const ensureEntry = db.prepare(`
      INSERT OR IGNORE INTO checklist_entries (room_id, checklist_date)
      VALUES (?, ?)
    `);
    const ensureAll = db.transaction(() => {
      for (const room of vipRooms) {
        ensureEntry.run(room.id, date);
      }
    });
    ensureAll();

    const entries = db
      .prepare(
        `SELECT c.*, r.room_number, r.nickname
         FROM checklist_entries c
         JOIN rooms r ON r.id = c.room_id
         WHERE c.checklist_date = ? AND r.is_vip = 1 AND r.is_active = 1
         ORDER BY r.room_number ASC`
      )
      .all(date) as Record<string, unknown>[];

    const parsed = entries.map((e) => ({
      ...e,
      step_checked: Boolean(e.step_checked),
      step_prepped: Boolean(e.step_prepped),
      step_cycled: Boolean(e.step_cycled),
    }));

    return NextResponse.json({ date, entries: parsed });
  } catch (error) {
    console.error("GET /api/checklist error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  try {
    const db = getDb();
    const body = await request.json();
    const {
      roomId,
      date,
      step_checked,
      step_prepped,
      step_cycled,
      completed_by,
      notes,
    } = body;

    if (!roomId || !date) {
      return NextResponse.json(
        { error: "roomId and date are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Build update fields dynamically based on what was changed
    const existing = db
      .prepare(
        "SELECT * FROM checklist_entries WHERE room_id = ? AND checklist_date = ?"
      )
      .get(roomId, date) as Record<string, unknown> | undefined;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (step_checked !== undefined) {
      updates.push("step_checked = ?");
      values.push(step_checked ? 1 : 0);
      if (step_checked && !existing?.checked_at) {
        updates.push("checked_at = ?");
        values.push(now);
      } else if (!step_checked) {
        updates.push("checked_at = NULL");
      }
    }

    if (step_prepped !== undefined) {
      updates.push("step_prepped = ?");
      values.push(step_prepped ? 1 : 0);
      if (step_prepped && !existing?.prepped_at) {
        updates.push("prepped_at = ?");
        values.push(now);
      } else if (!step_prepped) {
        updates.push("prepped_at = NULL");
      }
    }

    if (step_cycled !== undefined) {
      updates.push("step_cycled = ?");
      values.push(step_cycled ? 1 : 0);
      if (step_cycled && !existing?.cycled_at) {
        updates.push("cycled_at = ?");
        values.push(now);
      } else if (!step_cycled) {
        updates.push("cycled_at = NULL");
      }
    }

    if (completed_by !== undefined) {
      updates.push("completed_by = ?");
      values.push(completed_by ?? null);
    }

    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes ?? null);
    }

    if (updates.length > 0) {
      db.prepare(
        `INSERT INTO checklist_entries (room_id, checklist_date) VALUES (?, ?)
         ON CONFLICT(room_id, checklist_date) DO UPDATE SET ${updates.join(", ")}`
      ).run(roomId, date, ...values);
    }

    logAction({
      roomId,
      actionType: "CHECKLIST_UPDATE",
      result: "SUCCESS",
      details: `Updated checklist for ${date}: checked=${step_checked}, prepped=${step_prepped}, cycled=${step_cycled}`,
      triggeredByIp: clientIp,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/checklist error:", error);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

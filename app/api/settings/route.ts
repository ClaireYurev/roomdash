import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logAction } from "@/lib/logger";
import { defaultSettings } from "@/data/rooms-seed";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

export async function GET() {
  try {
    const db = getDb();

    // Ensure all default settings exist
    const insertDefault = db.prepare(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
    );
    const insertAll = db.transaction(() => {
      for (const [key, value] of Object.entries(defaultSettings)) {
        insertDefault.run(key, value);
      }
    });
    insertAll();

    const rows = db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const clientIp = getClientIp(request);
  try {
    const db = getDb();
    const body = await request.json();

    const updateSetting = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    );
    const updateAll = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        updateSetting.run(key, String(value));
      }
    });
    updateAll();

    logAction({
      actionType: "SETTINGS_CHANGE",
      result: "SUCCESS",
      details: `Updated settings: ${Object.keys(body).join(", ")}`,
      triggeredByIp: clientIp,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

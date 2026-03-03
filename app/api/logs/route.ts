import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { purgeOldLogs } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const roomId = searchParams.get("roomId") || "";
    const actionType = searchParams.get("actionType") || "";
    const result = searchParams.get("result") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Auto-purge based on settings
    const retentionSetting = db
      .prepare("SELECT value FROM settings WHERE key = 'log_retention_days'")
      .get() as { value: string } | undefined;
    if (retentionSetting) {
      purgeOldLogs(parseInt(retentionSetting.value, 10));
    }

    let where = "WHERE 1=1";
    const params: (string | number)[] = [];

    if (dateFrom) {
      where += " AND l.created_at >= ?";
      params.push(dateFrom + "T00:00:00.000Z");
    }
    if (dateTo) {
      where += " AND l.created_at <= ?";
      params.push(dateTo + "T23:59:59.999Z");
    }
    if (roomId) {
      where += " AND l.room_id = ?";
      params.push(parseInt(roomId, 10));
    }
    if (actionType) {
      where += " AND l.action_type = ?";
      params.push(actionType);
    }
    if (result) {
      where += " AND l.result = ?";
      params.push(result);
    }
    if (search) {
      where +=
        " AND (l.details LIKE ? OR r.nickname LIKE ? OR r.room_number LIKE ? OR l.triggered_by_ip LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total FROM logs l LEFT JOIN rooms r ON r.id = l.room_id ${where}`
      )
      .get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const rows = db
      .prepare(
        `SELECT l.*, r.room_number, r.nickname as room_nickname
         FROM logs l
         LEFT JOIN rooms r ON r.id = l.room_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset);

    return NextResponse.json({
      logs: rows,
      total: countRow.total,
      page,
      pageSize,
      totalPages: Math.ceil(countRow.total / pageSize),
    });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

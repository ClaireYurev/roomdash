import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = [
    "id",
    "timestamp",
    "room_number",
    "room_nickname",
    "action_type",
    "result",
    "details",
    "triggered_by_ip",
    "duration_ms",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escape(r.id),
        escape(r.created_at),
        escape(r.room_number),
        escape(r.room_nickname),
        escape(r.action_type),
        escape(r.result),
        escape(r.details),
        escape(r.triggered_by_ip),
        escape(r.duration_ms),
      ].join(",")
    ),
  ];
  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const roomId = searchParams.get("roomId") || "";
    const actionType = searchParams.get("actionType") || "";
    const result = searchParams.get("result") || "";
    const format = searchParams.get("format") || "csv";

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

    const rows = db
      .prepare(
        `SELECT l.*, r.room_number, r.nickname as room_nickname
         FROM logs l
         LEFT JOIN rooms r ON r.id = l.room_id
         ${where}
         ORDER BY l.created_at DESC`
      )
      .all(...params) as Record<string, unknown>[];

    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "json") {
      return new NextResponse(JSON.stringify(rows, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="roomdash-logs-${dateStr}.json"`,
        },
      });
    }

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="roomdash-logs-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/logs/export error:", error);
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500 }
    );
  }
}

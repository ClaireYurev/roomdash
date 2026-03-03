import { getDb } from "./db";
import type { ActionType, ActionResult } from "@/types";

export function logAction({
  roomId,
  actionType,
  result,
  details,
  triggeredByIp,
  durationMs,
}: {
  roomId?: number | null;
  actionType: ActionType;
  result: ActionResult;
  details?: string;
  triggeredByIp?: string;
  durationMs?: number;
}) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO logs (room_id, action_type, result, details, triggered_by_ip, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      roomId ?? null,
      actionType,
      result,
      details ?? null,
      triggeredByIp ?? null,
      durationMs ?? null
    );
  } catch (err) {
    console.error("Failed to write log:", err);
  }
}

export function purgeOldLogs(retentionDays: number) {
  const db = getDb();
  db.prepare(
    `DELETE FROM logs WHERE created_at < datetime('now', ? || ' days')`
  ).run(`-${retentionDays}`);
}

export interface Room {
  id: number;
  room_number: string;
  nickname: string;
  official_seats: number | null;
  max_seats: number | null;
  av_equipment: string[];
  shelly_ip: string | null;
  outlook_email: string | null;
  is_vip: boolean;
  is_bookable: boolean;
  bookable_method: "outlook" | "manual" | "none";
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShellyStatus {
  room_id: number;
  is_online: boolean;
  output_on: boolean;
  watts: number | null;
  voltage: number | null;
  temperature_c: number | null;
  last_polled: string | null;
  last_seen_online: string | null;
}

export interface RoomWithStatus extends Room {
  shelly_status: ShellyStatus | null;
}

export type PowerAction = "on" | "off" | "cycle";
export type ActionType =
  | "POWER_ON"
  | "POWER_OFF"
  | "POWER_CYCLE"
  | "CHECKLIST_UPDATE"
  | "STATUS_POLL"
  | "SETTINGS_CHANGE";
export type ActionResult = "SUCCESS" | "FAILURE" | "TIMEOUT";
export type OnlineStatus = "online" | "offline" | "degraded" | "no_shelly";

export interface LogEntry {
  id: number;
  room_id: number | null;
  room_number?: string;
  room_nickname?: string;
  action_type: ActionType;
  result: ActionResult;
  details: string | null;
  triggered_by_ip: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ChecklistEntry {
  id: number;
  room_id: number;
  checklist_date: string;
  step_checked: boolean;
  step_prepped: boolean;
  step_cycled: boolean;
  checked_at: string | null;
  prepped_at: string | null;
  cycled_at: string | null;
  completed_by: string | null;
  notes: string | null;
}

export interface ChecklistEntryWithRoom extends ChecklistEntry {
  room_number: string;
  room_nickname: string;
}

export interface AppSettings {
  shelly_poll_interval_ms: number;
  shelly_timeout_ms: number;
  log_retention_days: number;
  dashboard_refresh_interval_ms: number;
  checklist_reset_time: string;
  default_completed_by: string;
  app_display_name: string;
  timezone: string;
}

export interface LogFilters {
  dateFrom?: string;
  dateTo?: string;
  roomId?: string;
  actionType?: string;
  result?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

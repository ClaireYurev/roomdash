# RoomDash — Conference Room Dashboard
## Claude Code Project Brief

Paste this entire document at the start of your Claude Code session to bootstrap the project.

---

## Project Overview

Build a **local-network-only** Next.js 14 web dashboard for managing and monitoring office conference rooms. The app runs on a Raspberry Pi 4 (or similar mini PC) and is accessible to all users on the office WiFi/LAN. It is **not** exposed to the internet.

The dashboard controls **Shelly Gen4 smart plugs** (local REST API, no cloud) for power cycling Logitech AV hardware in conference rooms, displays room status, manages a daily maintenance checklist, and logs all actions.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite via `better-sqlite3` |
| Power control | Shelly Gen4 local HTTP REST API |
| Dark/light mode | `next-themes` + Tailwind `dark:` classes |
| Package manager | pnpm |
| Deployment target | Raspberry Pi 4, running via PM2, port 3000 |

---

## Room Data (Seed This Into the Database)

### VIP Rooms — Daily Check Required ⭐
These 7 rooms have full Logitech AV systems (NUC + Rally + Tap + Meetup + Microphones) and must be checked, prepped, and power cycled every morning. They each get a **Shelly Gen4 plug** for remote power cycling.

| Room # | Nickname | Official Seats | Max Seats | AV Equipment | Shelly IP (placeholder) |
|---|---|---|---|---|---|
| 168 | Hollywood | 12 | 16 | Logitech NUC + Rally + Tap + Meetup + Microphones; Additional Large TV (HDMI only) on Wheels | 192.168.1.101 |
| 180 | Manhattan Beach | — | — | Logitech NUC + Rally + Tap + Meetup (no mic) | 192.168.1.102 |
| 181 | Westwood | 5 | 6 | TV Only (HDMI only) | 192.168.1.103 |
| 183 | Long Beach | — | — | Logitech NUC + Rally + Tap + Meetup (no mic) | 192.168.1.104 |
| 185 | Inglewood | 3 | 3 | Logitech NUC + Rally + Tap + Meetup (no mic) | 192.168.1.105 |
| 187 | Santa Monica (Boardroom) | 10 | 14 | Logitech NUC + Rally + Tap + Meetup + Microphones | 192.168.1.106 |
| 191 | Silver Lake | 3 | 3 | Logitech NUC + Rally + Tap + Meetup (no mic) | 192.168.1.107 |

### Standard Rooms — Bookable via Outlook
These rooms are bookable but do NOT need daily power cycling. No Shelly plugs on these.

| Room # | Nickname | Official Seats | Max Seats | AV / Notes |
|---|---|---|---|---|
| 157 | Marina Del Rey | 1 | 1 | No screens |
| 158 | Pasadena | 3 | 3 | No screens |
| 183 | Hermosa Beach | 5 | 6 | TV Only (HDMI only) |
| 184 | Venice Beach | 3 | 3 | TV Only (HDMI only) |
| 188 | Malibu | 5 | 6 | TV Only (HDMI only) |
| 189 | Echo Park | 5 | 6 | TV Only (HDMI only) |
| 190 | Paradise Cove | 3 | 3 | TV Only (HDMI only) |
| 192 | Oasis (R&D Lab) | 10 | 14 | Logitech NUC + Rally + Tap + Meetup + Microphones |

### Non-Bookable / Special Rooms — Manual / Offline Only
These rooms are NOT bookable via Outlook. They use a handwritten paper ledger or are not meeting rooms.

| Room # | Nickname | Notes |
|---|---|---|
| 156 | IDF Closet / IT Closet | Secure IT Storage, Control Center. No seats. |
| 163 | Office Food Storage | Dry food & beverage. No seats, no screens. |
| 165 | Office Supplies Storage | Boxes & Boxes. No seats, no screens. |
| 167 | Mailroom | Unlocked IT Closet, misc storage. |
| 186 | Mullholland Drive | Actually a hallway with chairs. No TVs, no conferences. |

### Boardrooms — Manual Power Only (Excluded from Remote Cycling)
These rooms have their own dedicated AV systems (Murad Crestron). Power cycling must be done manually on-site. Show them in the dashboard as read-only status cards only.

| Room # | Nickname | Official Seats | Max Seats | AV |
|---|---|---|---|---|
| 300 | Murad Boardroom | 3 | 3 | Murad's Own Crestron AV System |
| 400 | Kate Somerville Boardroom | 3 | 3 | TV Only (HDMI only) |
| 500 | MPR Room — Murad Multi-Purpose Room (Boardroom) | 20 | 60 | Murad's Own Crestron AV System |

### Outlook Room Email Accounts (for calendar integration)
These are the Microsoft 365 / Exchange room mailboxes. Use these for the Microsoft Graph API calendar feed.

| Room Nickname | Email |
|---|---|
| Hollywood | LAH-HOLLYWOOD-MRS@unilever.com |
| Inglewood | LAH-INGLEWOOD-MRS@unilever.com |
| MNHTN BCH (Manhattan Beach) | LAH-MNHTN-BCH-MRS@unilever.com |
| Mulholland Dr. | LAH-MULHOLLANDDR-MRS@unilever.com |
| Paradise Cove | LAH-PARADISE-C-MRS@unilever.com |
| Santa Monica | LAH-SANTA-MONICA-MRS@unilever.com |
| Silver Lake | LAH-SILVER-LAKE-MRS@unilever.com |
| Long Beach | LAH-LONG-BEACH-MRS@unilever.com |

> **Note:** Not all rooms have Outlook accounts. Rooms without accounts cannot show calendar status.

---

## Shelly Gen4 Local API Reference

Shelly plugs expose a local HTTP REST API on the office LAN. No Shelly cloud account needed.

```
# Get device status (includes power draw in watts)
GET http://{SHELLY_IP}/rpc/Switch.GetStatus?id=0

# Turn ON
GET http://{SHELLY_IP}/rpc/Switch.Set?id=0&on=true

# Turn OFF
GET http://{SHELLY_IP}/rpc/Switch.Set?id=0&on=false

# Power cycle (turn off, wait 5 seconds, turn on)
# Implement as: POST off → setTimeout(5000) → POST on
```

Expected JSON response for GetStatus:
```json
{
  "id": 0,
  "source": "HTTP_in",
  "output": true,
  "apower": 45.2,       // current watts — use this to confirm NUC is running
  "voltage": 120.1,
  "current": 0.38,
  "temperature": { "tC": 38.5 }
}
```

---

## Full Feature Specification

### 1. Dashboard — Main Page (`/`)

**Room Cards Grid**
- Responsive grid: 1 col mobile, 2 col tablet, 3–4 col desktop
- Each card shows:
  - Room number + nickname (large, prominent)
  - "VIP" badge for the 7 daily-check rooms
  - Seat count (official / max)
  - AV equipment list (compact chips/badges)
  - Online status indicator: 🟢 Online / 🔴 Offline / 🟡 Degraded / ⚫ No Shelly
  - Live power draw in watts (for rooms with Shelly)
  - "Last seen" timestamp
  - Today's booking status (if Outlook email configured): "Available" / "In use until 3PM" / "Next: 2:00 PM"
  - Power controls (VIP rooms only): **On**, **Off**, **Cycle** buttons
  - Daily checklist mini-status (VIP rooms only): ✅ Checked / ✅ Prepped / ✅ Cycled

**Top Bar**
- App name "RoomDash" with logo/icon
- Date + time (live, updates every second)
- Light/dark mode toggle
- Quick-access nav: Dashboard | Checklist | Logs | Settings
- "All systems" health summary badge

**Filtering / Grouping**
- Filter by: All Rooms | VIP Only | Has Shelly | Available Now | Needs Attention
- Group by: Floor/Section | AV Type | Status
- Search box (fuzzy match on room name/number/nickname)

---

### 2. Daily Checklist Page (`/checklist`)

Every morning, a staff member works through the 7 VIP rooms. This page tracks that.

**Per Room (VIP rooms only):**
- Three checkbox steps in order:
  1. ☐ **Checked** — physically visited and confirmed hardware is present
  2. ☐ **Prepped** — TV on, Logitech Tap showing home screen, test call confirmed
  3. ☐ **Power Cycled** — NUC rebooted via Shelly or manually
- Notes textarea per room (free text)
- "Completed by" field (staff member name or initials)
- Timestamp auto-recorded when each checkbox is ticked
- "Power Cycle Now" shortcut button inline (triggers Shelly API)

**Page-level:**
- Progress bar: "5 / 7 rooms completed today"
- Date shown prominently — checklist resets at midnight automatically
- "Mark All Complete" shortcut (with confirmation dialog)
- View previous day's checklist button

---

### 3. Logs Page (`/logs`)

Complete audit trail of every action taken in the system.

**Log Entry Fields:**
- Timestamp (ISO 8601)
- Room number + nickname
- Action type: `POWER_ON` | `POWER_OFF` | `POWER_CYCLE` | `CHECKLIST_UPDATE` | `STATUS_POLL` | `SETTINGS_CHANGE`
- Result: `SUCCESS` | `FAILURE` | `TIMEOUT`
- Details (free text — e.g., "Power draw: 47W after cycle")
- Triggered by: IP address of browser that triggered the action
- Duration (ms) for API calls

**UI:**
- Paginated table (50 rows/page)
- Filter by: date range, room, action type, result
- Search across all fields
- **Export to CSV** button (respects active filters)
- **Export to JSON** button
- Log retention: 90 days (auto-purge older entries)
- Color coding: green = success, red = failure, yellow = timeout

---

### 4. Settings Page (`/settings`)

**Room Configuration**
- Table of all rooms with inline editing
- Fields per room: Room #, Nickname, Official Seats, Max Seats, AV Equipment (tags), Shelly IP, Outlook Email, Is VIP, Is Bookable, Notes
- Add new room button
- Delete room (with confirmation)
- "Test Shelly Connection" button — pings the IP and shows response time + current wattage

**Shelly Configuration**
- Global poll interval (default: 30 seconds)
- Per-room enable/disable polling toggle
- Shelly timeout setting (default: 3 seconds)
- "Ping All Shellys" button — bulk connectivity test

**Checklist Settings**
- Checklist reset time (default: 6:00 AM)
- Default "completed by" name
- Toggle which steps are required per room

**System Settings**
- Log retention period (30 / 60 / 90 / 180 days)
- Dashboard auto-refresh interval
- App display name
- Time zone

**Microsoft Graph / Calendar Settings** *(optional, can be left blank)*
- Tenant ID, Client ID, Client Secret fields (stored in `.env.local`, not DB)
- "Test Graph Connection" button
- Toggle calendar polling on/off globally

---

### 5. Room Detail Page (`/rooms/[id]`)

Click any room card to get full details:
- Full equipment list
- Real-time Shelly data (watts, voltage, temperature)
- Today's calendar (hourly timeline view)
- Power action history (last 30 days)
- Checklist history (last 30 days)
- Edit room settings inline

---

## Database Schema (SQLite)

```sql
-- Rooms
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  official_seats INTEGER,
  max_seats INTEGER,
  av_equipment TEXT,           -- JSON array of strings
  shelly_ip TEXT,              -- NULL if no Shelly
  outlook_email TEXT,          -- NULL if no Outlook account
  is_vip INTEGER DEFAULT 0,    -- 1 = daily check required
  is_bookable INTEGER DEFAULT 1,
  bookable_method TEXT DEFAULT 'outlook',  -- 'outlook' | 'manual' | 'none'
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Daily Checklist
CREATE TABLE checklist_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER REFERENCES rooms(id),
  checklist_date TEXT NOT NULL,    -- YYYY-MM-DD
  step_checked INTEGER DEFAULT 0,
  step_prepped INTEGER DEFAULT 0,
  step_cycled INTEGER DEFAULT 0,
  checked_at TEXT,
  prepped_at TEXT,
  cycled_at TEXT,
  completed_by TEXT,
  notes TEXT,
  UNIQUE(room_id, checklist_date)
);

-- Action Logs
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER REFERENCES rooms(id),
  action_type TEXT NOT NULL,
  result TEXT NOT NULL,
  details TEXT,
  triggered_by_ip TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Shelly Status Cache
CREATE TABLE shelly_status (
  room_id INTEGER PRIMARY KEY REFERENCES rooms(id),
  is_online INTEGER,
  output_on INTEGER,
  watts REAL,
  voltage REAL,
  temperature_c REAL,
  last_polled TEXT,
  last_seen_online TEXT
);
```

---

## Project Structure

```
roomdash/
├── app/
│   ├── layout.tsx                  # Root layout with ThemeProvider
│   ├── page.tsx                    # Main dashboard
│   ├── checklist/
│   │   └── page.tsx
│   ├── logs/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── rooms/
│   │   └── [id]/
│   │       └── page.tsx
│   └── api/
│       ├── rooms/
│       │   └── route.ts            # GET all rooms with live status
│       ├── rooms/[id]/
│       │   └── route.ts            # GET/PUT/DELETE single room
│       ├── power/
│       │   └── route.ts            # POST { roomId, action: 'on'|'off'|'cycle' }
│       ├── shelly/
│       │   └── poll/route.ts       # GET — polls all Shelly devices, updates cache
│       ├── checklist/
│       │   └── route.ts            # GET/POST checklist entries
│       ├── logs/
│       │   ├── route.ts            # GET logs with filters
│       │   └── export/route.ts     # GET CSV export
│       └── calendar/
│           └── route.ts            # GET today's bookings from Graph API
├── components/
│   ├── RoomCard.tsx
│   ├── RoomGrid.tsx
│   ├── PowerControls.tsx
│   ├── ChecklistPanel.tsx
│   ├── LogTable.tsx
│   ├── StatusBadge.tsx
│   ├── ShellyStatusWidget.tsx
│   └── CalendarStrip.tsx
├── lib/
│   ├── db.ts                       # SQLite connection + migrations
│   ├── shelly.ts                   # Shelly Gen4 API client
│   ├── graph.ts                    # Microsoft Graph API client (optional)
│   ├── logger.ts                   # Action logging utility
│   └── seed.ts                     # Seed DB with room data above
├── hooks/
│   ├── useRooms.ts                 # SWR hook for room status
│   ├── useChecklist.ts
│   └── useLogs.ts
├── types/
│   └── index.ts                    # Shared TypeScript types
├── data/
│   └── rooms-seed.ts               # Static room config (matches table above)
├── .env.local.example              # Template for secrets
└── README.md
```

---

## Environment Variables (`.env.local`)

```bash
# Shelly (no secrets needed — local IP only)
SHELLY_POLL_INTERVAL_MS=30000
SHELLY_TIMEOUT_MS=3000

# Microsoft Graph API (optional — for Outlook calendar)
GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_NAME=RoomDash
NEXT_PUBLIC_OFFICE_NAME=LA Office
TZ=America/Los_Angeles
```

---

## UI / UX Requirements

- **Dark mode first** — dark mode should be the default, light mode available via toggle
- **Responsive** — works on mobile (for staff checking rooms on their phone), tablet, and desktop
- **Real-time feel** — room status cards auto-refresh every 30 seconds without full page reload (use SWR)
- **Confirmation dialogs** — all destructive actions (power off, power cycle) require a confirmation modal before executing
- **Cooldown UI** — after a power cycle, show a countdown timer on that room's card (e.g., "Cooling down: 45s") to prevent double-cycling
- **Toast notifications** — success/failure toasts for all power actions and checklist saves
- **Keyboard accessible** — all actions reachable by keyboard
- **Color palette:**
  - Online: green (`#22c55e`)
  - Offline: red (`#ef4444`)
  - Degraded / Unknown: amber (`#f59e0b`)
  - No Shelly: slate (`#94a3b8`)
  - VIP badge: indigo/violet gradient

---

## Deployment Notes (README section)

```bash
# Development
pnpm install
pnpm dev

# Production (Raspberry Pi)
pnpm build
pnpm start   # runs on port 3000

# PM2 auto-restart
pm2 start npm --name roomdash -- start
pm2 save
pm2 startup

# Access from office network
# Assign Pi a static IP via router DHCP reservation
# Optionally add DNS: roomdash.local → Pi's IP
# Users visit: http://roomdash.local:3000 or http://192.168.1.50:3000
```

---

## First Steps for Claude Code

1. Scaffold the Next.js 14 project with TypeScript, Tailwind, shadcn/ui, and better-sqlite3
2. Create the DB schema and seed it with all room data from this brief
3. Build the Shelly API client (`lib/shelly.ts`) with `on`, `off`, `cycle`, and `getStatus` methods
4. Build the main dashboard page with room cards and live status polling
5. Build the daily checklist page
6. Build the logs page with CSV export
7. Build the settings page with room CRUD
8. Add dark/light mode toggle
9. Write the README with deployment instructions

Start with steps 1–4. Confirm with me before moving to 5+.

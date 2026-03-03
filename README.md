# RoomDash

A local-network conference room dashboard for the LA Office. Runs on a Raspberry Pi (or any mini PC) on the office LAN. Controls Shelly Gen4 smart plugs for AV power cycling, tracks daily maintenance checklists, and logs all actions.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite via `better-sqlite3` |
| Power control | Shelly Gen4 local HTTP REST API |
| Dark/light mode | `next-themes` + Tailwind `dark:` classes |
| Package manager | pnpm |
| Deployment | Raspberry Pi 4 via PM2, port 3000 |

## Features

- **Dashboard** — real-time room cards with live power draw, online status, AV equipment, and power controls
- **Daily Checklist** — 7 VIP rooms tracked with Checked / Prepped / Power Cycled steps
- **Action Logs** — full audit trail with CSV/JSON export and 90-day auto-retention
- **Settings** — room CRUD, Shelly config, system preferences
- **Room Detail** — per-room real-time Shelly data, power history
- **Dark mode first** — defaults to dark, toggle available in the top bar

## Quick Start (Development)

```bash
# 1. Clone
git clone https://github.com/ClaireYurev/roomdash
cd roomdash

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.local.example .env.local
# Edit .env.local if needed

# 4. Seed the database with all rooms
pnpm db:seed

# 5. Start the dev server
pnpm dev
# Visit http://localhost:3000
```

## Production Deployment (Raspberry Pi)

### Prerequisites

```bash
# Install Node.js 20+ via nvm or NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install build tools for better-sqlite3 native module
sudo apt-get install -y build-essential python3

# Install PM2
npm install -g pm2
```

### Deploy

```bash
# 1. Clone the repo
git clone https://github.com/ClaireYurev/roomdash
cd roomdash

# 2. Install dependencies (builds better-sqlite3 native module)
pnpm install

# 3. Copy and configure environment
cp .env.local.example .env.local
nano .env.local  # set TZ, poll intervals, etc.

# 4. Seed the database
pnpm db:seed

# 5. Build the production app
pnpm build

# 6. Start with PM2
pm2 start npm --name roomdash -- start
pm2 save
pm2 startup   # follow the printed instructions to enable auto-restart

# 7. Check it's running
pm2 status
pm2 logs roomdash
```

### Network Access

Assign the Pi a static IP via your router's DHCP reservation, then:

- Via IP: `http://192.168.1.50:3000`
- Via mDNS (optional): add `roomdash.local` in your router's DNS → Pi's IP

## Project Structure

```
roomdash/
├── app/
│   ├── layout.tsx              # Root layout with ThemeProvider + Toaster
│   ├── page.tsx                # Dashboard (room cards grid)
│   ├── checklist/page.tsx      # Daily checklist for 7 VIP rooms
│   ├── logs/page.tsx           # Action log with CSV/JSON export
│   ├── settings/page.tsx       # Room CRUD + system settings
│   ├── rooms/[id]/page.tsx     # Room detail page
│   └── api/
│       ├── rooms/              # GET all rooms, POST new room
│       ├── rooms/[id]/         # GET/PUT/DELETE single room
│       ├── power/              # POST power on/off/cycle
│       ├── shelly/poll/        # GET — polls all Shelly devices
│       ├── checklist/          # GET/POST checklist entries
│       ├── logs/               # GET paginated logs
│       ├── logs/export/        # GET CSV or JSON export
│       ├── settings/           # GET/PUT app settings
│       └── calendar/           # GET Outlook calendar (optional)
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── Navbar.tsx
│   ├── ThemeToggle.tsx
│   ├── RoomCard.tsx
│   ├── RoomGrid.tsx
│   ├── PowerControls.tsx
│   ├── ChecklistPanel.tsx
│   ├── LogTable.tsx
│   ├── StatusBadge.tsx
│   └── ShellyStatusWidget.tsx
├── lib/
│   ├── db.ts                   # SQLite singleton + schema migration
│   ├── shelly.ts               # Shelly Gen4 HTTP API client
│   ├── logger.ts               # Action logging to DB
│   ├── graph.ts                # Microsoft Graph API (optional)
│   └── seed.ts                 # Seeds DB with room data
├── hooks/
│   ├── useRooms.ts             # SWR hook for room status
│   ├── useChecklist.ts
│   └── useLogs.ts
├── types/index.ts
├── data/rooms-seed.ts          # All 23 rooms from the project brief
└── .env.local.example
```

## Shelly Gen4 Local API

The app communicates with Shelly plugs directly over LAN — no cloud required.

```
GET http://{SHELLY_IP}/rpc/Switch.GetStatus?id=0   # Current status + watts
GET http://{SHELLY_IP}/rpc/Switch.Set?id=0&on=true  # Turn on
GET http://{SHELLY_IP}/rpc/Switch.Set?id=0&on=false # Turn off
# Power cycle: off → wait 5s → on (handled in lib/shelly.ts)
```

## Environment Variables

See `.env.local.example` for all variables. Required for basic operation: none (Shelly IPs are stored in the DB). Optional:

```bash
GRAPH_TENANT_ID=     # Microsoft Graph (Outlook calendar)
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
```

## Database

SQLite file is stored at `data/roomdash.db` (created on first run). Schema:
- `rooms` — all 23 rooms with configuration
- `checklist_entries` — daily checklist state per VIP room
- `logs` — action audit log (auto-purged after 90 days)
- `shelly_status` — cached Shelly status per room
- `settings` — key/value app configuration

## VIP Rooms

| Room | Nickname | Shelly IP |
|---|---|---|
| 168 | Hollywood | 192.168.1.101 |
| 180 | Manhattan Beach | 192.168.1.102 |
| 181 | Westwood | 192.168.1.103 |
| 183 | Long Beach | 192.168.1.104 |
| 185 | Inglewood | 192.168.1.105 |
| 187 | Santa Monica | 192.168.1.106 |
| 191 | Silver Lake | 192.168.1.107 |

Update the Shelly IPs in Settings → Rooms after deployment to match your actual network.

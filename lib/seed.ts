import { getDb } from "./db";
import { roomsSeed, defaultSettings } from "../data/rooms-seed";

async function seed() {
  const db = getDb();

  const roomCount = (
    db.prepare("SELECT COUNT(*) as count FROM rooms").get() as {
      count: number;
    }
  ).count;

  if (roomCount === 0) {
    console.log("Seeding rooms...");
    const insertRoom = db.prepare(`
      INSERT INTO rooms (room_number, nickname, official_seats, max_seats, av_equipment,
        shelly_ip, outlook_email, is_vip, is_bookable, bookable_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction(() => {
      for (const room of roomsSeed) {
        insertRoom.run(
          room.room_number,
          room.nickname,
          room.official_seats,
          room.max_seats,
          JSON.stringify(room.av_equipment),
          room.shelly_ip,
          room.outlook_email,
          room.is_vip,
          room.is_bookable,
          room.bookable_method,
          room.notes
        );
      }
    });

    insertMany();
    console.log(`Seeded ${roomsSeed.length} rooms.`);
  } else {
    console.log(`Rooms already seeded (${roomCount} found). Skipping.`);
  }

  // Seed default settings
  const settingsCount = (
    db.prepare("SELECT COUNT(*) as count FROM settings").get() as {
      count: number;
    }
  ).count;

  if (settingsCount === 0) {
    console.log("Seeding default settings...");
    const insertSetting = db.prepare(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
    );
    const insertSettings = db.transaction(() => {
      for (const [key, value] of Object.entries(defaultSettings)) {
        insertSetting.run(key, value);
      }
    });
    insertSettings();
    console.log("Settings seeded.");
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

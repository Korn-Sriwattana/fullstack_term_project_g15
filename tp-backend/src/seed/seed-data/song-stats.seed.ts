import fs from "fs";
import path from "path";
import { dbClient } from "../../../db/client.js";
import { songStats } from "../../../db/schema.js";
import { eq } from "drizzle-orm";

export async function seedSongStats(songMap: Record<string, string>) {
  const dataPath = path.resolve("./data/song-stats.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ song-stats.json not found at ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const config = JSON.parse(fileContent);

  const minPlay = config.defaultPlayCountRange?.[0] ?? 1;
  const maxPlay = config.defaultPlayCountRange?.[1] ?? 50;
  const useRandom = config.useRandom ?? true;

  for (const id of Object.values(songMap)) {
    const existing = await dbClient
      .select()
      .from(songStats)
      .where(eq(songStats.songId, id))
      .limit(1);

    if (existing.length === 0) {
      const playCount = useRandom
        ? Math.floor(Math.random() * (maxPlay - minPlay + 1)) + minPlay
        : config.defaultPlayCount ?? 0;

      await dbClient.insert(songStats).values({
        songId: id,
        playCount,
        lastPlayedAt: new Date(),
      });

      console.log(`📊 Created stats for song ID: ${id} (plays: ${playCount})`);
    } else {
      console.log(`✅ Stats already exist for song ID: ${id}`);
    }
  }

  console.log("Finished seeding song stats\n");
}

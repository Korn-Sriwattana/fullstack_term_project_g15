import fs from "fs";
import path from "path";
import { dbClient } from "../../../db/client.js";
import { songs } from "../../../db/schema.js";
import { eq } from "drizzle-orm";

export async function seedSongs() {
  const dataPath = path.resolve("./data/songs.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ songs.json not found at ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const songList = JSON.parse(fileContent);

  const songMap: Record<string, string> = {};

  for (const s of songList) {
    const existing = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.youtubeVideoId, s.youtubeVideoId))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await dbClient.insert(songs).values(s).returning();
      songMap[s.youtubeVideoId] = inserted.id;
      console.log(`🎵 Added song: ${s.title}`);
    } else {
      songMap[s.youtubeVideoId] = existing[0].id;
      console.log(`✅ Song exists: ${s.title}`);
    }
  }

  console.log("Finished seeding songs\n");
  return songMap;
}

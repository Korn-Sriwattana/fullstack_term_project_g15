import fs from "fs";
import path from "path";
import { dbClient } from "../../../db/client.js";
import { likedSongs } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

export async function seedLikedSongs(
  userMap: Record<string, string>,
  songMap: Record<string, string>
) {
  const dataPath = path.resolve("./data/liked-songs.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ liked-songs.json not found at ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const liked = JSON.parse(fileContent);

  for (const l of liked) {
    const userId = userMap[l.userEmail];
    const songId = songMap[l.youtubeVideoId];

    if (!userId || !songId) {
      console.warn(
        `⚠️ Skipping: missing mapping for ${l.userEmail} or ${l.youtubeVideoId}`
      );
      continue;
    }

    const existing = await dbClient
      .select()
      .from(likedSongs)
      .where(and(eq(likedSongs.userId, userId), eq(likedSongs.songId, songId)))
      .limit(1);

    if (existing.length === 0) {
      await dbClient.insert(likedSongs).values({ userId, songId });
      console.log(`💖 Added liked song: ${l.youtubeVideoId} → ${l.userEmail}`);
    } else {
      console.log(`✅ Already liked: ${l.youtubeVideoId} by ${l.userEmail}`);
    }
  }

  console.log("Finished seeding liked songs\n");
}

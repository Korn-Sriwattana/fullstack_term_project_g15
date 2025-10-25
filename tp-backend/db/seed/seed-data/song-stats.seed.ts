import { dbClient } from "../../client.ts";
import { songStats } from "../../schema.ts";
import { eq } from "drizzle-orm";

export async function seedSongStats(songMap: Record<string, string>) {
  for (const id of Object.values(songMap)) {
    const existing = await dbClient
      .select()
      .from(songStats)
      .where(eq(songStats.songId, id))
      .limit(1);
    if (existing.length === 0) {
      await dbClient.insert(songStats).values({
        songId: id,
        playCount: Math.floor(Math.random() * 50) + 1,
        lastPlayedAt: new Date(),
      });
      console.log(`📊 Stats created for song ID: ${id}`);
    }
  }
}

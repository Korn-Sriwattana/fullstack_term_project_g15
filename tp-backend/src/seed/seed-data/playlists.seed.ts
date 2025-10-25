import fs from "fs";
import path from "path";
import { dbClient } from "../../../db/client.js";
import { playlists, playlistSongs } from "../../../db/schema.js";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";

export async function seedPlaylists(
  userMap: Record<string, string>,
  songMap: Record<string, string>
) {
  const dataPath = path.resolve("./data/playlists.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ playlists.json not found at ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const basePlaylists = JSON.parse(fileContent);

  const playlistMap: Record<string, string> = {};

  for (const pl of basePlaylists) {
    const ownerId = userMap[pl.ownerEmail];
    if (!ownerId) {
      console.warn(
        `⚠️ No user found for ${pl.ownerEmail}, skipping playlist "${pl.name}"`
      );
      continue;
    }

    const existing = await dbClient
      .select()
      .from(playlists)
      .where(eq(playlists.name, pl.name))
      .limit(1);

    let playlistId: string;
    if (existing.length === 0) {
      const [inserted] = await dbClient
        .insert(playlists)
        .values({
          id: randomUUID(),
          name: pl.name,
          description: pl.description,
          ownerId,
          coverUrl: pl.coverUrl,
          isPublic: true,
        })
        .returning();
      playlistId = inserted.id;
      console.log(`🎧 Created playlist: ${pl.name}`);
    } else {
      playlistId = existing[0].id;
      console.log(`✅ Playlist exists: ${pl.name}`);
    }

    playlistMap[pl.name] = playlistId;

    let order = 1;
    for (const vid of pl.songs) {
      const songId = songMap[vid];

      if (!songId) {
        console.warn(
          `⚠️ Skipping unknown song videoId "${vid}" in playlist "${pl.name}"`
        );
        continue;
      }

      const exist = await dbClient
        .select()
        .from(playlistSongs)
        .where(
          and(
            eq(playlistSongs.playlistId, playlistId),
            eq(playlistSongs.songId, songId)
          )
        )
        .limit(1);

      if (exist.length === 0) {
        await dbClient.insert(playlistSongs).values({
          playlistId,
          songId,
          customOrder: order++,
        });
        console.log(`   ➕ Added song ${vid} → ${pl.name}`);
      } else {
        console.log(`   ✅ Song ${vid} already in ${pl.name}`);
      }
    }
  }

  console.log("Finished seeding playlists and playlist_songs.\n");
  return playlistMap;
}

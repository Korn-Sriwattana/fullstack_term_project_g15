import { dbClient } from "../../../db/client.ts";
import { playlists, playlistSongs } from "../../../db/schema.ts";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";

export async function seedPlaylists(
  userMap: Record<string, string>,
  songMap: Record<string, string>
) {
  const basePlaylists = [
    {
      name: "Morning Soft",
      description: "Breezy acoustic and lo-fi songs ☀️",
      ownerEmail: "alice@example.com",
      coverUrl: "/uploads/playlist-covers/dummy01.png",
      songs: ["kxopViU98Xo", "L051YSpEEYU", "3AtDnEC4zak"],
    },
    {
      name: "Focus Beats",
      description: "Calm study session playlist 🎧",
      ownerEmail: "alice@example.com",
      coverUrl: "/uploads/playlist-covers/dummy02.png",
      songs: ["LmZD-TU96q4", "42wfEs7oIP8"],
    },
    {
      name: "Workout Energy",
      description: "Run faster, lift stronger 💪",
      ownerEmail: "bob@example.com",
      coverUrl: "/uploads/playlist-covers/dummy03.png",
      songs: ["HgzGwKwLmgM", "3AtDnEC4zak"],
    },
    {
      name: "Night Drive",
      description: "Songs for your midnight ride 🌙",
      ownerEmail: "bob@example.com",
      coverUrl: "/uploads/playlist-covers/dummy04.png",
      songs: ["L051YSpEEYU", "kxopViU98Xo"],
    },
    {
      name: "Chillwave Mix",
      description: "Electronic calmness and vibes 💫",
      ownerEmail: "charlie@example.com",
      coverUrl: "/uploads/playlist-covers/dummy05.png",
      songs: ["42wfEs7oIP8", "LmZD-TU96q4"],
    },
    {
      name: "Retro Vibes",
      description: "Oldies but goldies ✨",
      ownerEmail: "charlie@example.com",
      coverUrl: "/uploads/playlist-covers/dummy06.png",
      songs: ["HgzGwKwLmgM", "kxopViU98Xo", "3AtDnEC4zak"],
    },
  ];

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

import { dbClient } from "../../../db/client.ts";
import { likedSongs } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";

export async function seedLikedSongs(
  userMap: Record<string, string>,
  songMap: Record<string, string>
) {
  const liked = [
    { userEmail: "alice@example.com", youtubeVideoId: "L051YSpEEYU" },
    { userEmail: "bob@example.com", youtubeVideoId: "HgzGwKwLmgM" },
    { userEmail: "charlie@example.com", youtubeVideoId: "42wfEs7oIP8" },
  ];

  for (const l of liked) {
    const userId = userMap[l.userEmail];
    const songId = songMap[l.youtubeVideoId];
    const existing = await dbClient
      .select()
      .from(likedSongs)
      .where(eq(likedSongs.userId, userId))
      .limit(1);
    if (existing.length === 0) {
      await dbClient.insert(likedSongs).values({ userId, songId });
      console.log(`💖 Added liked song for ${l.userEmail}`);
    }
  }
  console.log("Finished seeding songs\n");
}

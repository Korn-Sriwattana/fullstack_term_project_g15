import { dbClient } from "../../../db/client.ts";
import { songs } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";

export async function seedSongs() {
  const songList = [
    {
      youtubeVideoId: "L051YSpEEYU",
      title: "ที่คั่นหนังสือ (Sometimes)",
      artist: "BOWKYLION Ft. NONT TANONT",
      duration: 326,
      coverUrl: "https://i.ytimg.com/vi/L051YSpEEYU/hqdefault.jpg",
    },
    {
      youtubeVideoId: "LmZD-TU96q4",
      title: "IRIS OUT",
      artist: "Kenshi Yonezu (米津玄師)",
      duration: 154,
      coverUrl: "https://i.ytimg.com/vi/LmZD-TU96q4/hqdefault.jpg",
    },
    {
      youtubeVideoId: "42wfEs7oIP8",
      title: "FaSHioN",
      artist: "CORTIS (HYBE LABELS)",
      duration: 180,
      coverUrl: "https://i.ytimg.com/vi/42wfEs7oIP8/hqdefault.jpg",
    },
    {
      youtubeVideoId: "kxopViU98Xo",
      title: "Lover Boy 88",
      artist: "Alxie Buanos",
      duration: 214,
      coverUrl: "https://i.ytimg.com/vi/kxopViU98Xo/hqdefault.jpg",
    },
    {
      youtubeVideoId: "3AtDnEC4zak",
      title: "Shape of You",
      artist: "Ed Sheeran",
      duration: 263,
      coverUrl: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    },
    {
      youtubeVideoId: "HgzGwKwLmgM",
      title: "Don't Stop Me Now",
      artist: "Queen",
      duration: 210,
      coverUrl: "https://i.ytimg.com/vi/HgzGwKwLmgM/hqdefault.jpg",
    },
  ];

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

  return songMap;
}

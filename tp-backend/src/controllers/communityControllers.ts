import { dbClient } from "@db/client.js";
import { roomQueue, songs, listeningRooms, songStats } from "@db/schema.js";
import { eq, asc, desc, sql } from "drizzle-orm";

export async function fetchYoutubeMetadata(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("YouTube API error");

  const data: any = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("❌ ไม่เจอเพลงบน YouTube");
  }

  const item = data.items[0];
  const title = item.snippet.title;
  const artist = item.snippet.channelTitle;
  const coverUrl = item.snippet.thumbnails?.high?.url || null;

  const durationISO = item.contentDetails.duration;
  const duration = parseISO8601Duration(durationISO);

  return { title, artist, coverUrl, duration };
}

function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match?.[1] || "0", 10);
  const minutes = parseInt(match?.[2] || "0", 10);
  const seconds = parseInt(match?.[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function sanitizeSong(song: any) {
  if (!song) return null;
  return {
    id: song.id,
    youtubeVideoId: song.youtubeVideoId,
    title: song.title,
    artist: song.artist,
    coverUrl: song.coverUrl,
    duration: song.duration,
  };
}

function sanitizeQueueItem(item: any) {
  return {
    id: item.id,
    queueIndex: item.queueIndex,
    queuedBy: item.queuedBy,
    song: sanitizeSong(item.song),
  };
}

// ---------- SOCKET ----------
export async function addToQueue(io: any, { roomId, songId, userId }: any) {
  const last = await dbClient.query.roomQueue.findFirst({
    where: eq(roomQueue.roomId, roomId),
    orderBy: desc(roomQueue.queueIndex),
  });
  const newIndex = (last?.queueIndex ?? -1) + 1;

  await dbClient.insert(roomQueue).values({
    roomId,
    songId,
    queuedBy: userId,
    queueIndex: newIndex,
  });

  // อัพเดทสถิติทันทีที่เพิ่มเข้า queue
  const now = new Date();
  await dbClient
    .insert(songStats)
    .values({
      songId,
      playCount: 1,
      communityPlayCount: 1,
      lastPlayedAt: now,
    })
    .onConflictDoUpdate({
      target: songStats.songId,
      set: {
        playCount: sql`${songStats.playCount} + 1`,
        communityPlayCount: sql`${songStats.communityPlayCount} + 1`,
        lastPlayedAt: now,
      },
    });

  const fullQueue = await dbClient
    .select({
      id: roomQueue.id,
      queueIndex: roomQueue.queueIndex,
      queuedBy: roomQueue.queuedBy,
      song: {
        id: songs.id,
        youtubeVideoId: songs.youtubeVideoId,
        title: songs.title,
        artist: songs.artist,
        coverUrl: songs.coverUrl,
        duration: songs.duration,
      },
    })
    .from(roomQueue)
    .leftJoin(songs, eq(roomQueue.songId, songs.id))
    .where(eq(roomQueue.roomId, roomId))
    .orderBy(asc(roomQueue.queueIndex));

  io.to(roomId).emit("queue-sync", { queue: fullQueue.map(sanitizeQueueItem) });

  //ถ้าไม่มีเพลงกำลังเล่นอยู่ ให้เล่นเพลงแรกในคิวทันที
  const [listening] = await dbClient
    .select({ currentSongId: listeningRooms.currentSongId })
    .from(listeningRooms)
    .where(eq(listeningRooms.id, roomId));

  if (!listening?.currentSongId && fullQueue.length > 0) {
    await playNextSong(io, roomId);
  }
}

export async function removeFromQueue(io: any, { roomId, queueId }: any) {
  console.log("🗑️ removeFromQueue called:", { roomId, queueId });

  // เช็คว่า queueId ยังมีอยู่จริงหรือไม่
  const [queueItem] = await dbClient
    .select({ id: roomQueue.id, songId: roomQueue.songId })
    .from(roomQueue)
    .where(eq(roomQueue.id, queueId));

  if (!queueItem) {
    console.log("⚠️ Queue item not found, already removed");
    return;
  }

  // เช็คว่าเพลงที่จะลบคือเพลงที่กำลังเล่นอยู่หรือไม่
  const [listening] = await dbClient
    .select({ currentSongId: listeningRooms.currentSongId })
    .from(listeningRooms)
    .where(eq(listeningRooms.id, roomId));

  const isCurrentlyPlaying = queueItem.songId === listening?.currentSongId;

  console.log("🎵 Is currently playing?", isCurrentlyPlaying);

  // ลบเพลงออกจากคิว
  await dbClient.delete(roomQueue).where(eq(roomQueue.id, queueId));

  // Reindex ทุกเพลงที่เหลือให้ติดกัน
  const remainingItems = await dbClient
    .select()
    .from(roomQueue)
    .where(eq(roomQueue.roomId, roomId))
    .orderBy(asc(roomQueue.queueIndex));

  console.log("📋 Remaining items after delete:", remainingItems.length);

  await dbClient.transaction(async (tx: any) => {
    for (let i = 0; i < remainingItems.length; i++) {
      await tx
        .update(roomQueue)
        .set({ queueIndex: i })
        .where(eq(roomQueue.id, remainingItems[i].id));
    }
  });

  // ส่ง queue ใหม่กลับไป client
  const fullQueue = await dbClient
    .select({
      id: roomQueue.id,
      queueIndex: roomQueue.queueIndex,
      queuedBy: roomQueue.queuedBy,
      song: {
        id: songs.id,
        youtubeVideoId: songs.youtubeVideoId,
        title: songs.title,
        artist: songs.artist,
        coverUrl: songs.coverUrl,
        duration: songs.duration,
      },
    })
    .from(roomQueue)
    .leftJoin(songs, eq(roomQueue.songId, songs.id))
    .where(eq(roomQueue.roomId, roomId))
    .orderBy(asc(roomQueue.queueIndex));

  io.to(roomId).emit("queue-sync", { queue: fullQueue.map(sanitizeQueueItem) });

  // 🔥 ถ้าลบเพลงที่กำลังเล่น → ให้ skip ไปเพลงถัดไปโดยไม่ลบอะไรเพิ่ม
  if (isCurrentlyPlaying) {
    console.log("⏭️ Current song removed, playing next without deleting from queue");
    
    // ดึงเพลงถัดไป (ถ้ามี)
    const [nextQueueItem] = await dbClient
      .select({
        id: roomQueue.id,
        songId: roomQueue.songId,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(roomQueue)
      .leftJoin(songs, eq(roomQueue.songId, songs.id))
      .where(eq(roomQueue.roomId, roomId))
      .orderBy(asc(roomQueue.queueIndex))
      .limit(1);

    const now = new Date();

    if (nextQueueItem) {
      // อัพเดท listening room ให้เล่นเพลงถัดไป
      await dbClient.update(listeningRooms)
        .set({ currentSongId: nextQueueItem.songId, currentStartedAt: now })
        .where(eq(listeningRooms.id, roomId));

      io.to(roomId).emit("now-playing", {
        roomId,
        song: sanitizeSong(nextQueueItem.song),
        startedAt: now,
      });
    } else {
      // ไม่มีเพลงแล้ว
      await dbClient.update(listeningRooms)
        .set({ currentSongId: null, currentStartedAt: null })
        .where(eq(listeningRooms.id, roomId));

      io.to(roomId).emit("now-playing", { roomId, song: null, startedAt: null });
    }
  }
}

// เพิ่ม Map เพื่อเก็บสถานะว่ากำลัง process อยู่หรือไม่
const processingRooms = new Map<string, boolean>();

export async function playNextSong(io: any, roomId: string) {
  // 🔒 ป้องกัน race condition
  if (processingRooms.get(roomId)) {
    console.log("⚠️ playNextSong already processing for room:", roomId);
    return;
  }

  processingRooms.set(roomId, true);

  try {
    console.log("⏭️ playNextSong called for room:", roomId);

    const [nextQueueItem] = await dbClient
      .select({
        id: roomQueue.id,
        songId: roomQueue.songId,
        queueIndex: roomQueue.queueIndex,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(roomQueue)
      .leftJoin(songs, eq(roomQueue.songId, songs.id))
      .where(eq(roomQueue.roomId, roomId))
      .orderBy(asc(roomQueue.queueIndex))
      .limit(1);

    const now = new Date();

    if (nextQueueItem) {
      console.log("🎵 Playing next song:", nextQueueItem.song?.title);

      // อัพเดท listening room
      await dbClient.update(listeningRooms)
        .set({ currentSongId: nextQueueItem.songId, currentStartedAt: now })
        .where(eq(listeningRooms.id, roomId));

      // ลบเพลงที่เริ่มเล่นออกจาก queue
      await dbClient.delete(roomQueue).where(eq(roomQueue.id, nextQueueItem.id));

      // Reindex เพลงที่เหลือ
      const remainingItems = await dbClient
        .select()
        .from(roomQueue)
        .where(eq(roomQueue.roomId, roomId))
        .orderBy(asc(roomQueue.queueIndex));

      console.log("📋 Remaining queue items:", remainingItems.length);

      await dbClient.transaction(async (tx: any) => {
        for (let i = 0; i < remainingItems.length; i++) {
          await tx
            .update(roomQueue)
            .set({ queueIndex: i })
            .where(eq(roomQueue.id, remainingItems[i].id));
        }
      });

      io.to(roomId).emit("now-playing", {
        roomId,
        song: sanitizeSong(nextQueueItem.song),
        startedAt: now,
      });
    } else {
      console.log("🛑 No more songs in queue");

      await dbClient.update(listeningRooms)
        .set({ currentSongId: null, currentStartedAt: null })
        .where(eq(listeningRooms.id, roomId));

      io.to(roomId).emit("now-playing", { roomId, song: null, startedAt: null });
    }

    // ส่ง queue อัพเดทกลับไป
    const fullQueue = await dbClient
      .select({
        id: roomQueue.id,
        queueIndex: roomQueue.queueIndex,
        queuedBy: roomQueue.queuedBy,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(roomQueue)
      .leftJoin(songs, eq(roomQueue.songId, songs.id))
      .where(eq(roomQueue.roomId, roomId))
      .orderBy(asc(roomQueue.queueIndex));

    io.to(roomId).emit("queue-sync", { queue: fullQueue.map(sanitizeQueueItem) });

  } finally {
    // 🔓 ปลดล็อคหลังเสร็จ
    setTimeout(() => {
      processingRooms.delete(roomId);
    }, 1000); // รอ 1 วินาที เผื่อ event ที่ซ้ำซ้อน
  }
}

export async function playSong(io: any, { roomId, song }: any) {
  const now = new Date();
  await dbClient.update(listeningRooms)
    .set({ currentSongId: song.id, currentStartedAt: now })
    .where(eq(listeningRooms.id, roomId));

  io.to(roomId).emit("now-playing", {
    roomId,
    song: sanitizeSong(song),
    startedAt: now,
  });
}

export async function reorderQueue(io: any, { roomId, queueId, newIndex }: any) {
  // ดึง queue ทั้งหมด
  const allItems = await dbClient
    .select()
    .from(roomQueue)
    .where(eq(roomQueue.roomId, roomId))
    .orderBy(asc(roomQueue.queueIndex));

  if (allItems.length === 0) return;

  const itemToMove = allItems.find(item => item.id === queueId);
  if (!itemToMove) return;

  const oldIndex = itemToMove.queueIndex;
  if (oldIndex === newIndex) return;

  // remove item จาก array
  const filtered = allItems.filter(item => item.id !== queueId);
  filtered.splice(newIndex, 0, itemToMove);

  // ใช้ transaction ปลอดภัย
  await dbClient.transaction(async (tx: any) => {
    // ขั้นแรก assign ค่า temporary สูงๆ เพื่อตัดปัญหา duplicate
    for (let i = 0; i < filtered.length; i++) {
      await tx
        .update(roomQueue)
        .set({ queueIndex: 1000 + i }) // temporary index
        .where(eq(roomQueue.id, filtered[i].id));
    }

    // จากนั้น normalize เป็น 0,1,2,...
    for (let i = 0; i < filtered.length; i++) {
      await tx
        .update(roomQueue)
        .set({ queueIndex: i })
        .where(eq(roomQueue.id, filtered[i].id));
    }
  });

  // ส่ง queue ใหม่กลับไป client
  const fullQueue = await dbClient
    .select({
      id: roomQueue.id,
      queueIndex: roomQueue.queueIndex,
      queuedBy: roomQueue.queuedBy,
      song: {
        id: songs.id,
        youtubeVideoId: songs.youtubeVideoId,
        title: songs.title,
        artist: songs.artist,
        coverUrl: songs.coverUrl,
        duration: songs.duration,
      },
    })
    .from(roomQueue)
    .leftJoin(songs, eq(roomQueue.songId, songs.id))
    .where(eq(roomQueue.roomId, roomId))
    .orderBy(asc(roomQueue.queueIndex));

  io.to(roomId).emit("queue-sync", { queue: fullQueue.map(sanitizeQueueItem) });
}

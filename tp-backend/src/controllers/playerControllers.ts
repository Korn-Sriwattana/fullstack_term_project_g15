import type { RequestHandler } from "express";
import { dbClient } from "@db/client.js";
import { personalQueue, playerState, songs, playlists, playlistSongs, playHistory } from "@db/schema.js";
import { eq, and, asc, desc } from "drizzle-orm";

// ========== HELPER FUNCTIONS ==========

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper: บันทึกประวัติการเล่น
async function recordPlayHistory(userId: string, songId: string) {
  await dbClient.insert(playHistory).values({
    userId,
    songId,
  });
}

// ดึง Recently Played
export const getRecentlyPlayed: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // ดึงทั้งหมดแล้วกรองใน JS
    const allHistory = await dbClient
      .select({
        id: playHistory.id,
        playedAt: playHistory.playedAt,
        songId: playHistory.songId,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(playHistory)
      .leftJoin(songs, eq(playHistory.songId, songs.id))
      .where(eq(playHistory.userId, userId))
      .orderBy(desc(playHistory.playedAt));

    // กรองให้เหลือเพลงไม่ซ้ำ (เอาครั้งล่าสุดของแต่ละเพลง)
    const seen = new Set<string>();
    const uniqueHistory = allHistory
      .filter(item => {
        if (seen.has(item.songId)) return false;
        seen.add(item.songId);
        return true;
      })
      .slice(0, limit);

    res.json(uniqueHistory);
  } catch (err) {
    next(err);
  }
};

// ========== PLAY SONG (เล่นเพลงเดี่ยว) ==========
export const PersonalplaySong: RequestHandler = async (req, res, next) => {
  try {
    const { userId, songId } = req.body;

    if (!userId || !songId) {
      res.status(400).json({ error: "Missing userId or songId" });
      return;
    }

    // 1. ล้าง queue เก่า
    await dbClient.delete(personalQueue).where(eq(personalQueue.userId, userId));

    // 2. เพิ่มเพลงนี้เข้า queue (เพลงเดียว)
    await dbClient.insert(personalQueue).values({
      userId,
      songId,
      queueIndex: 0,
      source: "manual",
    });

    // 3. ดึงข้อมูลเพลง
    const [song] = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    // 4. อัพเดท player state
    await dbClient
      .insert(playerState)
      .values({
        userId,
        currentSongId: songId,
        currentIndex: 0,
        currentTime: 0,
        isPlaying: true,
      })
      .onConflictDoUpdate({
        target: playerState.userId,
        set: {
          currentSongId: songId,
          currentIndex: 0,
          currentTime: 0,
          isPlaying: true,
          updatedAt: new Date(),
        },
      });

    await recordPlayHistory(userId, songId);

    res.json({
      message: "Playing song",
      song: sanitizeSong(song),
      queue: [sanitizeSong(song)],
    });
  } catch (err) {
    next(err);
  }
};

// ========== PLAY PLAYLIST ==========
export const playPlaylist: RequestHandler = async (req, res, next) => {
  try {
    const { userId, playlistId, shuffle = false } = req.body;

    if (!userId || !playlistId) {
      res.status(400).json({ error: "Missing userId or playlistId" });
      return;
    }

    // 1. ดึงเพลงจาก playlist
    const playlistSongsData = await dbClient
      .select({
        songId: playlistSongs.songId,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(playlistSongs)
      .leftJoin(songs, eq(playlistSongs.songId, songs.id))
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(asc(playlistSongs.addedAt));

    if (playlistSongsData.length === 0) {
      res.status(404).json({ error: "Playlist is empty" });
      return;
    }

    // 2. ล้าง queue เก่า
    await dbClient.delete(personalQueue).where(eq(personalQueue.userId, userId));

    // 3. สร้าง queue
    let orderedSongs = playlistSongsData;
    let shuffledIndices: number[] | null = null;

    if (shuffle) {
      // สุ่มลำดับ
      const indices = Array.from({ length: orderedSongs.length }, (_, i) => i);
      shuffledIndices = shuffleArray(indices);
      orderedSongs = shuffledIndices.map((i) => playlistSongsData[i]);
    }

    // 4. เพิ่มเข้า queue
    await dbClient.transaction(async (tx) => {
      for (let i = 0; i < orderedSongs.length; i++) {
        await tx.insert(personalQueue).values({
          userId,
          songId: orderedSongs[i].songId,
          queueIndex: i,
          source: "playlist",
          sourcePlaylistId: playlistId,
        });
      }
    });

    // 5. อัพเดท player state
    const firstSong = orderedSongs[0];
    await dbClient
      .insert(playerState)
      .values({
        userId,
        currentSongId: firstSong.songId,
        currentIndex: 0,
        currentTime: 0,
        isPlaying: true,
        shuffleMode: shuffle,
        shuffledIndices: shuffledIndices ? JSON.stringify(shuffledIndices) : null,
      })
      .onConflictDoUpdate({
        target: playerState.userId,
        set: {
          currentSongId: firstSong.songId,
          currentIndex: 0,
          currentTime: 0,
          isPlaying: true,
          shuffleMode: shuffle,
          shuffledIndices: shuffledIndices ? JSON.stringify(shuffledIndices) : null,
          updatedAt: new Date(),
        },
      });

    res.json({
      message: "Playing playlist",
      song: sanitizeSong(firstSong.song),
      queue: orderedSongs.map((s) => sanitizeSong(s.song)),
    });
  } catch (err) {
    next(err);
  }
};

// ========== PLAY NEXT ==========
export const playNext: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // 1. ดึง player state
    const [state] = await dbClient
      .select()
      .from(playerState)
      .where(eq(playerState.userId, userId))
      .limit(1);

    if (!state) {
      res.status(404).json({ error: "No active player" });
      return;
    }

    // 2. ดึง queue
    const queue = await dbClient
      .select()
      .from(personalQueue)
      .where(eq(personalQueue.userId, userId))
      .orderBy(asc(personalQueue.queueIndex));

    if (queue.length === 0) {
      res.status(404).json({ error: "Queue is empty" });
      return;
    }

    const currentIndex = state.currentIndex ?? 0;
    let nextIndex = currentIndex + 1; 

    // 3. จัดการ repeat mode
    if (state.repeatMode === "one") {
      // เล่นเพลงเดิมซ้ำ
      nextIndex = currentIndex;
    } else if (nextIndex >= queue.length) {
      if (state.repeatMode === "all") {
        // กลับไปเพลงแรก
        nextIndex = 0;
      } else {
        // จบ queue แล้ว
        await dbClient
          .update(playerState)
          .set({ isPlaying: false, updatedAt: new Date() })
          .where(eq(playerState.userId, userId));

        res.json({ message: "End of queue", song: null });
        return;
      }
    }

    // 4. ดึงเพลงถัดไป
    const nextQueueItem = queue[nextIndex];
    const [song] = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.id, nextQueueItem.songId))
      .limit(1);

    // 5. อัพเดท player state
    await dbClient
      .update(playerState)
      .set({
        currentSongId: song.id,
        currentIndex: nextIndex,
        currentTime: 0,
        isPlaying: true,
        updatedAt: new Date(),
      })
      .where(eq(playerState.userId, userId));

    await recordPlayHistory(userId, song.id);

    res.json({
      message: "Playing next song",
      song: sanitizeSong(song),
      currentIndex: nextIndex,
    });
  } catch (err) {
    next(err);
  }
};

// ========== PLAY PREVIOUS ==========
export const playPrevious: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // 1. ดึง player state
    const [state] = await dbClient
      .select()
      .from(playerState)
      .where(eq(playerState.userId, userId))
      .limit(1);

    if (!state || state.currentIndex === 0) {
      res.status(400).json({ error: "Already at first song" });
      return;
    }

    // 2. ดึง queue
    const queue = await dbClient
      .select()
      .from(personalQueue)
      .where(eq(personalQueue.userId, userId))
      .orderBy(asc(personalQueue.queueIndex));

    const currentIndex = state.currentIndex ?? 0;
    const prevIndex = currentIndex - 1;
    const prevQueueItem = queue[prevIndex];

    // 3. ดึงเพลงก่อนหน้า
    const [song] = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.id, prevQueueItem.songId))
      .limit(1);

    // 4. อัพเดท player state
    await dbClient
      .update(playerState)
      .set({
        currentSongId: song.id,
        currentIndex: prevIndex,
        currentTime: 0,
        isPlaying: true,
        updatedAt: new Date(),
      })
      .where(eq(playerState.userId, userId));

    await recordPlayHistory(userId, song.id);

    res.json({
      message: "Playing previous song",
      song: sanitizeSong(song),
      currentIndex: prevIndex,
    });
  } catch (err) {
    next(err);
  }
};

// ========== ADD TO QUEUE (เพิ่มท้าย) ==========
export const addToPersonalQueue: RequestHandler = async (req, res, next) => {
  try {
    const { userId, songId } = req.body;

    if (!userId || !songId) {
      res.status(400).json({ error: "Missing userId or songId" });
      return;
    }

    // หา index สูงสุดใน queue
    const [last] = await dbClient
      .select()
      .from(personalQueue)
      .where(eq(personalQueue.userId, userId))
      .orderBy(desc(personalQueue.queueIndex))
      .limit(1);

    const newIndex = (last?.queueIndex ?? -1) + 1;

    // เพิ่มเข้า queue
    await dbClient.insert(personalQueue).values({
      userId,
      songId,
      queueIndex: newIndex,
      source: "manual",
    });

    // ดึงข้อมูลเพลง
    const [song] = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);

      if (newIndex === 0) {
      await recordPlayHistory(userId, songId);
      
      await dbClient
        .insert(playerState)
        .values({
          userId,
          currentSongId: songId,
          currentIndex: 0,
          currentTime: 0,
          isPlaying: true,
        })
        .onConflictDoUpdate({
          target: playerState.userId,
          set: {
            currentSongId: songId,
            currentIndex: 0,
            currentTime: 0,
            isPlaying: true,
            updatedAt: new Date(),
          },
        });
      
      console.log("Auto-playing added song as it's the first in the queue");

      res.json({
        message: "Added to queue and started playing",
        song: sanitizeSong(song),
        queueIndex: newIndex,
        autoPlay: true, // บอก frontend ว่าควรเล่นทันที
      });
      return;
    }

    res.json({
      message: "Added to queue",
      song: sanitizeSong(song),
      queueIndex: newIndex,
    });
  } catch (err) {
    next(err);
  }
};

// ========== GET QUEUE ==========
export const getQueue: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // ดึง queue พร้อมข้อมูลเพลง
    const queue = await dbClient
      .select({
        id: personalQueue.id,
        queueIndex: personalQueue.queueIndex,
        source: personalQueue.source,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(personalQueue)
      .leftJoin(songs, eq(personalQueue.songId, songs.id))
      .where(eq(personalQueue.userId, userId))
      .orderBy(asc(personalQueue.queueIndex));

    res.json(queue);
  } catch (err) {
    next(err);
  }
};

// ========== GET PLAYER STATE ==========
export const getPlayerState: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const [state] = await dbClient
      .select()
      .from(playerState)
      .where(eq(playerState.userId, userId))
      .limit(1);

    if (!state) {
      res.json(null);
      return;
    }

    // ดึงข้อมูลเพลงปัจจุบัน
    let currentSong = null;
    if (state.currentSongId) {
      const [song] = await dbClient
        .select()
        .from(songs)
        .where(eq(songs.id, state.currentSongId))
        .limit(1);
      currentSong = sanitizeSong(song);
    }

    res.json({
      ...state,
      currentSong,
      shuffledIndices: state.shuffledIndices ? JSON.parse(state.shuffledIndices) : null,
    });
  } catch (err) {
    next(err);
  }
};

// ========== TOGGLE SHUFFLE ==========
export const toggleShuffle: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const [state] = await dbClient
      .select()
      .from(playerState)
      .where(eq(playerState.userId, userId))
      .limit(1);

    if (!state) {
      res.status(404).json({ error: "No active player" });
      return;
    }

    const newShuffleMode = !state.shuffleMode;

    // TODO: Implement shuffle logic (reshuffle queue)
    
    await dbClient
      .update(playerState)
      .set({
        shuffleMode: newShuffleMode,
        updatedAt: new Date(),
      })
      .where(eq(playerState.userId, userId));

    res.json({
      message: `Shuffle ${newShuffleMode ? "enabled" : "disabled"}`,
      shuffleMode: newShuffleMode,
    });
  } catch (err) {
    next(err);
  }
};

// ========== SET REPEAT MODE ==========
export const setRepeatMode: RequestHandler = async (req, res, next) => {
  try {
    const { userId, mode } = req.body;

    if (!userId || !mode) {
      res.status(400).json({ error: "Missing userId or mode" });
      return;
    }

    if (!["off", "all", "one"].includes(mode)) {
      res.status(400).json({ error: "Invalid mode" });
      return;
    }

    await dbClient
      .update(playerState)
      .set({
        repeatMode: mode,
        updatedAt: new Date(),
      })
      .where(eq(playerState.userId, userId));

    res.json({
      message: `Repeat mode set to ${mode}`,
      repeatMode: mode,
    });
  } catch (err) {
    next(err);
  }
};
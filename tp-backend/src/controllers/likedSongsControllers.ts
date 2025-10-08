import type { RequestHandler } from "express";
import { dbClient } from "@db/client.js";
import { likedSongs, songs, personalQueue, playerState } from "@db/schema.js";
import { eq, and, desc } from "drizzle-orm";

// ========== GET LIKED SONGS ==========
export const getLikedSongs: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const likedSongsData = await dbClient
      .select({
        id: likedSongs.id,
        likedAt: likedSongs.likedAt,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(likedSongs)
      .leftJoin(songs, eq(likedSongs.songId, songs.id))
      .where(eq(likedSongs.userId, userId))
      .orderBy(desc(likedSongs.likedAt));

    // Filter out any null songs
    const validLikedSongs = likedSongsData.filter(item => item.song !== null);

    res.json(validLikedSongs);
  } catch (err) {
    next(err);
  }
};

// ========== ADD TO LIKED SONGS ==========
export const addLikedSong: RequestHandler = async (req, res, next) => {
  try {
    const { userId, songId } = req.body;

    if (!userId || !songId) {
      res.status(400).json({ error: "Missing userId or songId" });
      return;
    }

    // Check if already liked
    const [existing] = await dbClient
      .select()
      .from(likedSongs)
      .where(
        and(
          eq(likedSongs.userId, userId),
          eq(likedSongs.songId, songId)
        )
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ 
        error: "Song already liked",
        message: "This song is already in your Liked Songs" 
      });
      return;
    }

    // Add to liked songs
    const [liked] = await dbClient
      .insert(likedSongs)
      .values({
        userId,
        songId,
      })
      .returning();

    res.status(201).json({ 
      success: true, 
      message: "Song added to Liked Songs",
      data: liked
    });
  } catch (err) {
    next(err);
  }
};

// ========== REMOVE FROM LIKED SONGS ==========
export const removeLikedSong: RequestHandler = async (req, res, next) => {
  try {
    const { userId, songId } = req.params;

    if (!userId || !songId) {
      res.status(400).json({ error: "Missing userId or songId" });
      return;
    }

    await dbClient
      .delete(likedSongs)
      .where(
        and(
          eq(likedSongs.userId, userId),
          eq(likedSongs.songId, songId)
        )
      );

    res.json({ 
      success: true, 
      message: "Song removed from Liked Songs" 
    });
  } catch (err) {
    next(err);
  }
};

// ========== CHECK IF SONG IS LIKED ==========
export const checkLikedSong: RequestHandler = async (req, res, next) => {
  try {
    const { userId, songId } = req.params;

    if (!userId || !songId) {
      res.status(400).json({ error: "Missing userId or songId" });
      return;
    }

    const [liked] = await dbClient
      .select()
      .from(likedSongs)
      .where(
        and(
          eq(likedSongs.userId, userId),
          eq(likedSongs.songId, songId)
        )
      )
      .limit(1);

    res.json({ isLiked: !!liked });
  } catch (err) {
    next(err);
  }
};

// ========== PLAY ALL LIKED SONGS ==========
export const playLikedSongs: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { shuffle = false } = req.body;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // Get all liked songs
    const likedSongsData = await dbClient
      .select({
        songId: likedSongs.songId,
        song: {
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        },
      })
      .from(likedSongs)
      .leftJoin(songs, eq(likedSongs.songId, songs.id))
      .where(eq(likedSongs.userId, userId))
      .orderBy(desc(likedSongs.likedAt));

    if (likedSongsData.length === 0) {
      res.status(404).json({ error: "No liked songs found" });
      return;
    }

    // Clear existing queue
    await dbClient.delete(personalQueue).where(eq(personalQueue.userId, userId));

    // Prepare songs
    let orderedSongs = likedSongsData.filter(item => item.song !== null);
    let shuffledIndices: number[] | null = null;

    if (shuffle) {
      // Shuffle
      const indices = Array.from({ length: orderedSongs.length }, (_, i) => i);
      shuffledIndices = indices.sort(() => Math.random() - 0.5);
      orderedSongs = shuffledIndices.map((i) => likedSongsData[i]);
    }

    // Add to queue
    await dbClient.transaction(async (tx) => {
      for (let i = 0; i < orderedSongs.length; i++) {
        await tx.insert(personalQueue).values({
          userId,
          songId: orderedSongs[i].songId,
          queueIndex: i,
          source: "liked",
        });
      }
    });

    // Update player state
    const firstSong = orderedSongs[0].song!;
    await dbClient
      .insert(playerState)
      .values({
        userId,
        currentSongId: firstSong.id,
        currentIndex: 0,
        currentTime: 0,
        isPlaying: true,
        shuffleMode: shuffle,
        shuffledIndices: shuffledIndices ? JSON.stringify(shuffledIndices) : null,
      })
      .onConflictDoUpdate({
        target: playerState.userId,
        set: {
          currentSongId: firstSong.id,
          currentIndex: 0,
          currentTime: 0,
          isPlaying: true,
          shuffleMode: shuffle,
          shuffledIndices: shuffledIndices ? JSON.stringify(shuffledIndices) : null,
          updatedAt: new Date(),
        },
      });

    res.json({
      message: "Playing liked songs",
      song: firstSong,
      queue: orderedSongs.map((s) => s.song),
    });
  } catch (err) {
    next(err);
  }
};
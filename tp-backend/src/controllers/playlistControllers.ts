import type { RequestHandler } from "express";
import { dbClient } from "@db/client.js";
import { playlists, playlistSongs, songs } from "@db/schema.js";
import { eq, and, asc, sql } from "drizzle-orm";

// ========== GET USER PLAYLISTS ==========
export const getUserPlaylists: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // ดึง playlists พร้อมนับจำนวนเพลง
    const userPlaylists = await dbClient
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        coverUrl: playlists.coverUrl,
        isPublic: playlists.isPublic,
        createdAt: playlists.createdAt,
      })
      .from(playlists)
      .where(eq(playlists.ownerId, userId))
      .orderBy(asc(playlists.createdAt));

    // นับจำนวนเพลงในแต่ละ playlist
    const playlistsWithCount = await Promise.all(
      userPlaylists.map(async (playlist) => {
        const [count] = await dbClient
          .select({ count: sql<number>`count(*)` })
          .from(playlistSongs)
          .where(eq(playlistSongs.playlistId, playlist.id));

        return {
          ...playlist,
          songCount: Number(count.count) || 0,
        };
      })
    );

    res.json(playlistsWithCount);
  } catch (err) {
    next(err);
  }
};

// ========== CREATE PLAYLIST ==========
export const createPlaylist: RequestHandler = async (req, res, next) => {
  try {
    const { userId, name, description, isPublic = true } = req.body;

    if (!userId || !name?.trim()) {
      res.status(400).json({ error: "Missing userId or playlist name" });
      return;
    }

    const [playlist] = await dbClient
      .insert(playlists)
      .values({
        ownerId: userId,
        name: name.trim(),
        description: description?.trim() || null,
        isPublic,
      })
      .returning();

    res.status(201).json({
      ...playlist,
      songCount: 0,
    });
  } catch (err) {
    next(err);
  }
};

// ========== DELETE PLAYLIST ==========
export const deletePlaylist: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId } = req.params;

    if (!playlistId) {
      res.status(400).json({ error: "Missing playlistId" });
      return;
    }

    // ลบ playlist (playlistSongs จะถูกลบอัตโนมัติด้วย CASCADE)
    await dbClient
      .delete(playlists)
      .where(eq(playlists.id, playlistId));

    res.json({ success: true, message: "Playlist deleted" });
  } catch (err) {
    next(err);
  }
};

// ========== GET PLAYLIST SONGS ==========
export const getPlaylistSongs: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId } = req.params;

    if (!playlistId) {
      res.status(400).json({ error: "Missing playlistId" });
      return;
    }

    const playlistSongsData = await dbClient
      .select({
        id: playlistSongs.playlistId, // ใช้เป็น unique id
        addedAt: playlistSongs.addedAt,
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

    // สร้าง unique id สำหรับแต่ละ item (playlistId + songId)
    const formattedData = playlistSongsData
      .filter((item): item is typeof item & { song: NonNullable<typeof item.song> } => 
        item.song !== null
      )
      .map((item, index) => ({
        id: `${playlistId}-${item.song.id}`, // unique id
        addedAt: item.addedAt,
        song: item.song,
      }));

    res.json(formattedData);
  } catch (err) {
    next(err);
  }
};

// ========== ADD SONG TO PLAYLIST ==========
export const addSongToPlaylist: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { songId } = req.body;

    if (!playlistId || !songId) {
      res.status(400).json({ error: "Missing playlistId or songId" });
      return;
    }

    // ตรวจสอบว่าเพลงมีอยู่ใน playlist แล้วหรือไม่
    const [existing] = await dbClient
      .select()
      .from(playlistSongs)
      .where(
        and(
          eq(playlistSongs.playlistId, playlistId),
          eq(playlistSongs.songId, songId)
        )
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ 
        error: "Song already in playlist",
        message: "This song is already in your playlist" 
      });
      return;
    }

    // เพิ่มเพลงเข้า playlist
    await dbClient
      .insert(playlistSongs)
      .values({
        playlistId,
        songId,
      });

    res.status(201).json({ 
      success: true, 
      message: "Song added to playlist" 
    });
  } catch (err) {
    next(err);
  }
};

// ========== REMOVE SONG FROM PLAYLIST ==========
export const removeSongFromPlaylist: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId, playlistSongId } = req.params;

    if (!playlistId || !playlistSongId) {
      res.status(400).json({ error: "Missing parameters" });
      return;
    }

    // แยก songId จาก playlistSongId (format: "playlistId-songId")
    const songId = playlistSongId.split('-')[1];

    if (!songId) {
      res.status(400).json({ error: "Invalid playlistSongId format" });
      return;
    }

    // ลบเพลงออกจาก playlist
    await dbClient
      .delete(playlistSongs)
      .where(
        and(
          eq(playlistSongs.playlistId, playlistId),
          eq(playlistSongs.songId, songId)
        )
      );

    res.json({ 
      success: true, 
      message: "Song removed from playlist" 
    });
  } catch (err) {
    next(err);
  }
};

// ========== UPDATE PLAYLIST INFO ==========
export const updatePlaylist: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { name, description, isPublic, isFavorite } = req.body;

    if (!playlistId) {
      res.status(400).json({ error: "Missing playlistId" });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (isFavorite !== undefined) updates.isFavorite = isFavorite;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await dbClient
      .update(playlists)
      .set(updates)
      .where(eq(playlists.id, playlistId))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
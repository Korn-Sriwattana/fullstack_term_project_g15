import type { RequestHandler } from "express";
import { dbClient } from "@db/client.js";
import { playlists, playlistSongs, songs } from "@db/schema.js";
import { eq, and, asc, sql, desc } from "drizzle-orm";

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
    const { userId, name, description, isPublic = true, coverUrl } = req.body;

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
        coverUrl: coverUrl || null, 
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

// ========== GET PLAYLIST SONGS (รองรับ sortBy และ sortOrder) ==========
export const getPlaylistSongs: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { sortBy = 'custom', sortOrder = 'asc' } = req.query;

    if (!playlistId) {
      res.status(400).json({ error: "Missing playlistId" });
      return;
    }

    let orderByClause;
    const order = sortOrder === 'desc' ? desc : asc;
    
    switch (sortBy) {
      case 'custom':
        orderByClause = asc(playlistSongs.customOrder);
        break;
      case 'dateAdded':
        orderByClause = order(playlistSongs.addedAt);
        break;
      case 'title':
        orderByClause = order(songs.title);
        break;
      case 'artist':
        orderByClause = order(songs.artist);
        break;
      case 'duration':
        orderByClause = order(songs.duration);
        break;
      default:
        orderByClause = asc(playlistSongs.customOrder);
    }

    const playlistSongsData = await dbClient
      .select({
        id: playlistSongs.id,
        playlistId: playlistSongs.playlistId,
        songId: playlistSongs.songId,
        addedAt: playlistSongs.addedAt,
        customOrder: playlistSongs.customOrder,
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
      .orderBy(orderByClause);

    const formattedData = playlistSongsData
      .filter((item): item is typeof item & { song: NonNullable<typeof item.song> } => 
        item.song !== null
      )
      .map((item) => ({
        id: item.id,
        addedAt: item.addedAt,
        customOrder: item.customOrder,
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

    // หา customOrder สูงสุดใน playlist นี้
    const [maxOrder] = await dbClient
      .select({ maxOrder: sql<number>`COALESCE(MAX(${playlistSongs.customOrder}), -1)` })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId));

    const nextOrder = (maxOrder?.maxOrder ?? -1) + 1;

    // เพิ่มเพลงเข้า playlist พร้อม customOrder
    await dbClient
      .insert(playlistSongs)
      .values({
        playlistId,
        songId,
        customOrder: nextOrder,
      });

    res.status(201).json({ 
      success: true, 
      message: "Song added to playlist" 
    });
  } catch (err) {
    next(err);
  }
};

// ========== REORDER PLAYLIST SONGS ==========
export const reorderPlaylistSongs: RequestHandler = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { songId, newOrder } = req.body;

    if (!playlistId || !songId || newOrder === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // ดึงรายการเพลงทั้งหมดใน playlist
    const allSongs = await dbClient
      .select()
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(asc(playlistSongs.customOrder));

    if (allSongs.length === 0) {
      res.status(404).json({ error: "Playlist is empty" });
      return;
    }

    // หาเพลงที่ต้องการย้าย
    const songIndex = allSongs.findIndex(s => s.songId === songId);
    if (songIndex === -1) {
      res.status(404).json({ error: "Song not found in playlist" });
      return;
    }

    // ตรวจสอบว่า newOrder อยู่ในช่วงที่ถูกต้อง
    if (newOrder < 0 || newOrder >= allSongs.length) {
      res.status(400).json({ error: "Invalid new order" });
      return;
    }

    // ถ้าตำแหน่งเดิมและใหม่เหมือนกัน ไม่ต้องทำอะไร
    if (songIndex === newOrder) {
      res.json({ success: true, message: "No change needed" });
      return;
    }

    // จัดเรียงใหม่
    const reordered = [...allSongs];
    const [movedSong] = reordered.splice(songIndex, 1);
    reordered.splice(newOrder, 0, movedSong);

    // อัพเดท customOrder ในฐานข้อมูล
    await dbClient.transaction(async (tx) => {
      for (let i = 0; i < reordered.length; i++) {
        await tx
          .update(playlistSongs)
          .set({ customOrder: i })
          .where(eq(playlistSongs.id, reordered[i].id));
      }
    });

    res.json({ 
      success: true, 
      message: "Playlist reordered successfully" 
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

    // ลบเพลง
    const result = await dbClient
      .delete(playlistSongs)
      .where(eq(playlistSongs.id, playlistSongId))
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: "Song not found in playlist" });
      return;
    }

    // จัดเรียง customOrder ใหม่
    const remainingSongs = await dbClient
      .select()
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId))
      .orderBy(asc(playlistSongs.customOrder));

    await dbClient.transaction(async (tx) => {
      for (let i = 0; i < remainingSongs.length; i++) {
        await tx
          .update(playlistSongs)
          .set({ customOrder: i })
          .where(eq(playlistSongs.id, remainingSongs[i].id));
      }
    });

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
    const { name, description, isPublic, coverUrl } = req.body;

    if (!playlistId) {
      res.status(400).json({ error: "Missing playlistId" });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;

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
import "dotenv/config";
import { dbClient } from "@db/client.js";
import {
  roomMessages,
  users,
  roomMembers,
  roomQueue,
  listeningRooms,
  songs,
  songStats,
} from "@db/schema.js";
import cors from "cors";
import Debug from "debug";
import { eq, asc, and, desc, or, ilike, sql } from "drizzle-orm";
import type {
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";

// Controllers
import {
  playNext,
  playPrevious,
  playPlaylist,
  PersonalplaySong,
  getQueue,
  addToPersonalQueue,
  getPlayerState,
  toggleShuffle,
  setRepeatMode,
  getRecentlyPlayed,
} from "./controllers/playerControllers.js";
import { createUser } from "./controllers/userControllers.js";
import {
  createRoom,
  joinRoom,
  listPublicRooms,
} from "./controllers/roomControllers.js";
import {
  addToQueue,
  removeFromQueue,
  playNextSong,
  playSong,
  reorderQueue,
  fetchYoutubeMetadata,
} from "./controllers/communityControllers.js";
import {
  getUserPlaylists,
  createPlaylist,
  deletePlaylist,
  getPlaylistSongs,
  addSongToPlaylist,
  removeSongFromPlaylist,
  updatePlaylist,
  reorderPlaylistSongs,
} from "./controllers/playlistControllers.js";
import {
  getLikedSongs,
  addLikedSong,
  removeLikedSong,
  checkLikedSong,
  playLikedSongs,
} from "./controllers/likedSongsControllers.js";
import { upload, uploadPlaylistCover } from "./controllers/imageControllers.js";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth.ts";

const debug = Debug("pf-backend");

// Initializing the express app
const app = express();

// Enable CORS for HTTP requests
app.use(
  cors({
    origin: "http://localhost:5173", // frontend dev
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Middleware
app.use(morgan("dev"));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// WebSocket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});
app.locals.io = io;

// ----------------- REST API -----------------

// Users
app.post("/users", createUser);

// ----------------- Personal Player API -----------------

// Play single song
app.post("/player/play-song", PersonalplaySong);

// Play playlist
app.post("/player/play-playlist", playPlaylist);

// Navigation
app.post("/player/next", playNext);
app.post("/player/previous", playPrevious);

// Queue management
app.post("/player/queue/add", addToPersonalQueue);
app.get("/player/queue/:userId", getQueue);

// Player state
app.get("/player/state/:userId", getPlayerState);
app.post("/player/shuffle", toggleShuffle);
app.post("/player/repeat", setRepeatMode);
app.get("/player/recently-played/:userId", getRecentlyPlayed);

// ดึงเพลงยอดนิยม (เรียงตาม playCount)
// Get popular songs (by play count)
app.get(
  "/songs/popular",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const popularSongs = await dbClient
        .select({
          playCount: songStats.playCount,
          lastPlayedAt: songStats.lastPlayedAt,
          song: {
            id: songs.id,
            youtubeVideoId: songs.youtubeVideoId,
            title: songs.title,
            artist: songs.artist,
            coverUrl: songs.coverUrl,
            duration: songs.duration,
          },
        })
        .from(songStats)
        .leftJoin(songs, eq(songStats.songId, songs.id))
        .where(sql`${songStats.playCount} > 0`)
        .orderBy(desc(songStats.playCount), desc(songStats.lastPlayedAt))
        .limit(limit);

      // Filter out songs that don't exist anymore
      const validSongs = popularSongs.filter((item) => item.song !== null);

      res.json(validSongs);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------- Image Upload API -----------------
app.post("/upload/playlist-cover", upload.single("cover"), uploadPlaylistCover);

// ----------------- Playlist API -----------------

// Get user playlists
app.get("/playlists/:userId", getUserPlaylists);

// Create playlist
app.post("/playlists", createPlaylist);

// Update playlist
app.patch("/playlists/:playlistId", updatePlaylist);

// Delete playlist
app.delete("/playlists/:playlistId", deletePlaylist);

// Get playlist songs
app.get("/playlists/:playlistId/songs", getPlaylistSongs);

// Add song to playlist
app.post("/playlists/:playlistId/songs", addSongToPlaylist);

// Reorder (Custom Order)
app.patch("/playlists/:playlistId/reorder", reorderPlaylistSongs);

// Remove song from playlist
app.delete(
  "/playlists/:playlistId/songs/:playlistSongId",
  removeSongFromPlaylist
);

// ----------------- Liked Songs API -----------------

// Get liked songs
app.get("/liked-songs/:userId", getLikedSongs);

// Add to liked songs
app.post("/liked-songs", addLikedSong);

// Remove from liked songs
app.delete("/liked-songs/:userId/:songId", removeLikedSong);

// Check if song is liked
app.get("/liked-songs/:userId/:songId/check", checkLikedSong);

// Play all liked songs
app.post("/liked-songs/:userId/play", playLikedSongs);

// ----------------- Community Player API -----------------

// Rooms
app.post("/rooms", createRoom);
//Join room by inviteCode
app.post("/rooms/join", joinRoom);

// List public rooms
app.get("/rooms/public", listPublicRooms);

// Fetch chat messages
app.get(
  "/chat/:roomId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;

      const results = await dbClient
        .select({
          id: roomMessages.id,
          message: roomMessages.message,
          createdAt: roomMessages.createdAt,
          roomId: roomMessages.roomId,
          userId: roomMessages.userId,
          // แก้ไขส่วนนี้ให้เป็น object
          user: {
            id: users.id,
            name: users.name,
            profilePic: users.profilePic,
          },
        })
        .from(roomMessages)
        .leftJoin(users, eq(roomMessages.userId, users.id))
        .where(eq(roomMessages.roomId, roomId))
        .orderBy(asc(roomMessages.createdAt));

      // แปลง results ให้ตรงกับ interface
      const formatted = results.map((row) => ({
        id: row.id,
        message: row.message,
        createdAt: row.createdAt,
        roomId: row.roomId,
        userId: row.userId,
        // เช็คว่า row.user และ row.user.id มีค่าหรือไม่
        user:
          row.user && row.user.id
            ? {
                id: row.user.id,
                name: row.user.name || "Unknown User",
                profilePic: row.user.profilePic || undefined,
              }
            : undefined,
      }));

      res.json(formatted);
    } catch (err) {
      next(err);
    }
  }
);

// Post chat message
app.post("/chat", async (req, res, next) => {
  try {
    const { roomId, userId, message } = req.body;

    if (!message || !roomId || !userId)
      throw new Error("Missing required fields");

    // roomId, userId ต้องเป็น UUID เช่น "7a7e8d34-..."
    const result = await dbClient
      .insert(roomMessages)
      .values({ roomId, userId, message })
      .returning();

    res.json({ msg: "Message sent successfully", data: result[0] });
  } catch (err) {
    next(err);
  }
});

// ----------------- Songs API -----------------

// ค้นหาเพลง (title หรือ artist)
app.get(
  "/songs/search",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        res.json([]);
        return;
      }

      const results = await dbClient
        .select()
        .from(songs)
        .where(or(ilike(songs.title, `%${q}%`), ilike(songs.artist, `%${q}%`)))
        .limit(20);

      res.json(results);
    } catch (err) {
      next(err);
    }
  }
);

// เพิ่มเพลงใหม่ (จาก YouTube link)
app.post(
  "/songs/add",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { youtubeVideoId } = req.body;

      if (!youtubeVideoId) {
        res.status(400).json({ error: "Missing youtubeVideoId" });
        return;
      }

      // ดึง metadata จาก YouTube API
      const { title, artist, duration, coverUrl } = await fetchYoutubeMetadata(
        youtubeVideoId
      );

      // insert หรือหาเพลงที่มีอยู่แล้ว
      const [inserted] = await dbClient
        .insert(songs)
        .values({
          youtubeVideoId,
          title,
          artist,
          duration,
          coverUrl,
        })
        .onConflictDoNothing({ target: songs.youtubeVideoId })
        .returning();

      let song = inserted;
      if (!song) {
        [song] = await dbClient
          .select()
          .from(songs)
          .where(eq(songs.youtubeVideoId, youtubeVideoId))
          .limit(1);
      }

      // อัพเดทสถิติทันทีที่เพิ่ม
      const now = new Date();
      await dbClient
        .insert(songStats)
        .values({
          songId: song.id,
          playCount: 1,
          lastPlayedAt: now,
        })
        .onConflictDoUpdate({
          target: songStats.songId,
          set: {
            playCount: sql`${songStats.playCount} + 1`,
            lastPlayedAt: now,
          },
        });

      res.json(song);
    } catch (err) {
      next(err);
    }
  }
);

app.get("/rooms/:roomId/queue", async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const results = await dbClient
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
        },
      })
      .from(roomQueue)
      .leftJoin(songs, eq(roomQueue.songId, songs.id))
      .where(eq(roomQueue.roomId, roomId))
      .orderBy(asc(roomQueue.queueIndex));

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ----------------- WebSocket -----------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // เก็บ userId ใน socket เมื่อ connect
  socket.on("set-user", (userId: string) => {
    (socket as any).userId = userId;
    console.log(`Socket ${socket.id} set userId: ${userId}`);
  });

  // Join room
  socket.on("join-room", async (roomId) => {
    socket.join(roomId);

    const newCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    io.emit("room-count-updated", { roomId, count: newCount });

    const socketUserId = (socket as any).userId; // เก็บ userId ใน socket
    if (socketUserId) {
      const [user] = await dbClient.query.users.findMany({
        where: eq(users.id, socketUserId),
        limit: 1,
      });

      if (user) {
        await sendSystemMessage(io, roomId, `${user.name} joined the room`);
      }
    }
    // fetch queue และ now-playing ล่าสุด
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

    const [listening] = await dbClient
      .select({
        currentSongId: listeningRooms.currentSongId,
        currentStartedAt: listeningRooms.currentStartedAt,
        hostId: listeningRooms.hostId,
      })
      .from(listeningRooms)
      .where(eq(listeningRooms.id, roomId));

    let currentSong = null;
    if (listening?.currentSongId) {
      const [song] = await dbClient
        .select({
          id: songs.id,
          youtubeVideoId: songs.youtubeVideoId,
          title: songs.title,
          artist: songs.artist,
          coverUrl: songs.coverUrl,
          duration: songs.duration,
        })
        .from(songs)
        .where(eq(songs.id, listening.currentSongId));
      currentSong = song;
    }

    // ส่ง queue และ now-playing ให้ client
    socket.emit("queue-sync", { queue: fullQueue.map(sanitizeQueueItem) });
    if (currentSong && listening?.currentStartedAt) {
      socket.emit("now-playing", {
        roomId,
        song: sanitizeSong(currentSong),
        startedAt: listening.currentStartedAt,
        hostId: listening.hostId,
      });
    } else {
      socket.emit("now-playing", {
        roomId,
        song: null,
        startedAt: null,
        hostId: listening?.hostId,
      });
    }
    console.log(
      `User ${socket.id} joined room ${roomId} (${newCount} members)`
    );
  });

  // Chat
  socket.on("chat-message", async ({ roomId, userId, message }) => {
    const [msg] = await dbClient
      .insert(roomMessages)
      .values({ roomId, userId, message })
      .returning();

    // ดึงข้อมูล user
    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, userId),
      limit: 1,
    });

    io.to(roomId).emit("chat-message", {
      id: msg.id,
      roomId: msg.roomId,
      userId: msg.userId,
      message: msg.message,
      createdAt: msg.createdAt,
      user: user
        ? {
            id: user.id,
            name: user.name,
            profilePic: user.profilePic,
          }
        : undefined,
    });
  });

  socket.on("queue-add", async (payload) => {
    await addToQueue(io, payload);

    // หาชื่อ user และชื่อเพลง
    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, payload.userId),
      limit: 1,
    });

    const [song] = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.id, payload.songId))
      .limit(1);

    if (user && song) {
      await sendSystemMessage(
        io,
        payload.roomId,
        `${user.name} added "${song.title}" to queue`
      );
    }
  });

  socket.on("play-song", (payload) => playSong(io, payload));
  socket.on("queue-remove", async (payload) => {
    console.log("🔴 queue-remove event received from", socket.id, payload);

    // หาข้อมูลก่อนลบ
    const [queueItem] = await dbClient
      .select({
        song: {
          title: songs.title,
        },
      })
      .from(roomQueue)
      .leftJoin(songs, eq(roomQueue.songId, songs.id))
      .where(eq(roomQueue.id, payload.queueId))
      .limit(1);

    const socketUserId = (socket as any).userId;
    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, socketUserId),
      limit: 1,
    });

    await removeFromQueue(io, payload);

    // ส่ง system message
    if (user && queueItem?.song) {
      await sendSystemMessage(
        io,
        payload.roomId,
        `${user.name} removed "${queueItem.song.title}" from queue`
      );
    }
  });

  socket.on("song-ended", (payload) => {
    console.log("⏹️ song-ended event received from", socket.id);
    const roomId = typeof payload === "string" ? payload : payload?.roomId;
    if (roomId) {
      playNextSong(io, roomId);
    }
  });

  socket.on("skip-song", async (payload) => {
    console.log("⏭️ skip-song event received from", socket.id, payload);

    // 🆕 หาชื่อเพลงที่กำลังเล่น
    const [listening] = await dbClient
      .select({
        currentSongId: listeningRooms.currentSongId,
      })
      .from(listeningRooms)
      .where(eq(listeningRooms.id, payload.roomId));

    let songTitle = "current song";
    if (listening?.currentSongId) {
      const [song] = await dbClient
        .select()
        .from(songs)
        .where(eq(songs.id, listening.currentSongId))
        .limit(1);
      if (song) songTitle = `"${song.title}"`;
    }

    const socketUserId = (socket as any).userId;
    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, socketUserId),
      limit: 1,
    });

    if (payload.roomId) {
      await playNextSong(io, payload.roomId);

      // 🆕 ส่ง system message
      if (user) {
        await sendSystemMessage(
          io,
          payload.roomId,
          `${user.name} skipped ${songTitle}`
        );
      }
    }
  });

  socket.on("queue-reorder", (payload) => reorderQueue(io, payload));

  // Leave room (ผู้ใช้กดออกเอง)
  socket.on("leave-room", async ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.error("❌ Missing roomId or userId on leave-room");
      return;
    }

    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, userId),
      limit: 1,
    });

    socket.leave(roomId);

    // ลบจาก room_members
    await dbClient
      .delete(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId))
      );

    const newCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    io.emit("room-count-updated", { roomId, count: newCount });
    if (user) {
      await sendSystemMessage(io, roomId, `${user.name} left the room`);
    }
    console.log(
      `User ${userId} (${socket.id}) left room ${roomId} (${newCount} members)`
    );
  });

  // Leave room (ตอน disconnect)
  socket.on("disconnecting", async () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        // ลบออกจาก DB ด้วย
        await dbClient
          .delete(roomMembers)
          .where(eq(roomMembers.roomId, roomId));

        const room = io.sockets.adapter.rooms.get(roomId);
        const newCount = room ? room.size - 1 : 0;

        io.emit("room-count-updated", { roomId, count: newCount });
        console.log(
          `User ${socket.id} disconnected from room ${roomId} (${newCount} members)`
        );
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

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

// Helper function สำหรับส่ง system message
async function sendSystemMessage(io: any, roomId: string, message: string) {
  const systemMsg = {
    userId: "system",
    userName: "System",
    message: message,
    isSystem: true,
    createdAt: new Date(),
  };

  // ส่งไปยัง client ทันที
  io.to(roomId).emit("chat-message", systemMsg);

  // บันทึกลง database (optional)
  try {
    await dbClient.insert(roomMessages).values({
      roomId,
      userId: "system",
      message: message,
    });
  } catch (err) {
    console.error("Failed to save system message:", err);
  }
}

// ----------------- Error Middleware -----------------
const jsonErrorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  debug(err.message);
  res.status(500).json({
    message: err.message || "Internal Server Error",
    type: err.name || "Error",
    stack: err.stack,
  });
};

app.use(jsonErrorHandler);

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, this is Lukchang vibe backend server!");
});

server.listen(PORT, () => {
  debug(`Listening on port ${PORT}: http://localhost:${PORT}`);
  console.log(`Listening on port ${PORT}: http://localhost:${PORT}`);
});

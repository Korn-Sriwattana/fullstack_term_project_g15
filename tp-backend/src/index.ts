import "dotenv/config";
import { dbClient } from "@db/client.js";
import { roomMessages, users, roomMembers, roomQueue, listeningRooms, songs, songStats} from "@db/schema.js";
import cors from "cors";
import Debug from "debug";
import { eq, asc, and, desc, or, ilike, sql } from "drizzle-orm";
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";

// Controllers
import { playNext, playPrevious, playPlaylist, PersonalplaySong, getQueue, addToPersonalQueue, getPlayerState, toggleShuffle, setRepeatMode, getRecentlyPlayed } from "./controllers/playerControllers.js";
import { createUser } from "./controllers/userControllers.js";
import { createRoom, joinRoom, listPublicRooms } from "./controllers/roomControllers.js";
import { addToQueue, removeFromQueue, playNextSong, playSong, reorderQueue, fetchYoutubeMetadata } from "./controllers/communityControllers.js";

const debug = Debug("pf-backend");

// Initializing the express app
const app = express();

// Middleware
app.use(morgan("dev"));
app.use(helmet());
app.use(express.json());

// Enable CORS for HTTP requests
app.use(
  cors({
    origin: "http://localhost:5173", // frontend dev
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

// ----------------- Community Player API -----------------

// Rooms
app.post("/rooms", createRoom);
//Join room by inviteCode
app.post("/rooms/join", joinRoom);

// List public rooms
app.get("/rooms/public", listPublicRooms);

// Fetch chat messages
app.get(  "/chat/:roomId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;

      const results = await dbClient
        .select({
          id: roomMessages.id,
          message: roomMessages.message,
          createdAt: roomMessages.createdAt,
          userId: roomMessages.userId,
          userName: users.name,
        })
        .from(roomMessages)
        .leftJoin(users, eq(roomMessages.userId, users.id))
        .where(eq(roomMessages.roomId, roomId))
        .orderBy(asc(roomMessages.createdAt)); // เรียงจากเก่าสุดไปใหม่สุด

      res.json(results);
    } catch (err) {
      next(err);
    }
  }
);

// Post chat message
app.post("/chat", async (req, res, next) => {
  try {
    const { roomId, userId, message } = req.body;

    if (!message || !roomId || !userId) throw new Error("Missing required fields");

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
  app.get("/songs/search", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        res.json([]);
        return;
      }

      const results = await dbClient
        .select()
        .from(songs)
        .where(
          or(
            ilike(songs.title, `%${q}%`),
            ilike(songs.artist, `%${q}%`)
          )
        )
        .limit(20);

      res.json(results);
    } catch (err) {
      next(err);
    }
  });

  // เพิ่มเพลงใหม่ (จาก YouTube link)
  app.post("/songs/add", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { youtubeVideoId } = req.body;

      if (!youtubeVideoId) {
        res.status(400).json({ error: "Missing youtubeVideoId" });
        return;
      }

      // ดึง metadata จาก YouTube API
      const { title, artist, duration, coverUrl } = await fetchYoutubeMetadata(youtubeVideoId);

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
  });

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

  // Join room
  socket.on("join-room", async (roomId) => {
    socket.join(roomId);

    const newCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    io.emit("room-count-updated", { roomId, count: newCount });

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
        hostId: listeningRooms.hostId
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
          hostId: listening.hostId
        });
      } else {
        socket.emit("now-playing", { 
          roomId, 
          song: null,
          startedAt: null,
          hostId: listening?.hostId
        });
      }
    console.log(`User ${socket.id} joined room ${roomId} (${newCount} members)`);
  });

  // Chat
  socket.on("chat-message", async ({ roomId, userId, message }) => {
    const [msg] = await dbClient
      .insert(roomMessages)
      .values({ roomId, userId, message })
      .returning();

    // ดึงชื่อ user
    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, userId),
      limit: 1,
    });

    io.to(roomId).emit("chat-message", {
      userId,
      userName: user?.name || "Unknown",
      message: msg.message,
    });
  });

  socket.on("queue-add", (payload) => addToQueue(io, payload));
  socket.on("play-song", (payload) => playSong(io, payload));
  socket.on("queue-remove", (payload) => {
  console.log("🔴 queue-remove event received from", socket.id, payload);
  removeFromQueue(io, payload);
});

socket.on("song-ended", (payload) => {
  console.log("⏹️ song-ended event received from", socket.id);
  const roomId = typeof payload === 'string' ? payload : payload?.roomId;
  if (roomId) {
    playNextSong(io, roomId);
  }
});

socket.on("skip-song", (payload) => {
  console.log("⏭️ skip-song event received from", socket.id, payload);
  if (payload.roomId) {
    playNextSong(io, payload.roomId);
  }
});

  socket.on("queue-reorder", (payload) => reorderQueue(io, payload));

  // Leave room (ผู้ใช้กดออกเอง)
  socket.on("leave-room", async ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.error("❌ Missing roomId or userId on leave-room");
      return;
    }

    socket.leave(roomId);

    // ลบจาก room_members
    await dbClient.delete(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));

    const newCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    io.emit("room-count-updated", { roomId, count: newCount });
    console.log(`User ${userId} (${socket.id}) left room ${roomId} (${newCount} members)`);
  });


  // Leave room (ตอน disconnect)
  socket.on("disconnecting", async () => {
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        // ลบออกจาก DB ด้วย
        await dbClient.delete(roomMembers)
          .where(eq(roomMembers.roomId, roomId));

        const room = io.sockets.adapter.rooms.get(roomId);
        const newCount = room ? room.size - 1 : 0;

        io.emit("room-count-updated", { roomId, count: newCount });
        console.log(`User ${socket.id} disconnected from room ${roomId} (${newCount} members)`);
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
    duration: song.duration
  };
}

function sanitizeQueueItem(item: any) {
  return {
    id: item.id,
    queueIndex: item.queueIndex,
    queuedBy: item.queuedBy,
    song: sanitizeSong(item.song)
  };
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
server.listen(PORT, () => {
  debug(`Listening on port ${PORT}: http://localhost:${PORT}`);
});

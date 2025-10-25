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
  friends,
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
import {
  upload,
  uploadPlaylistCover,
  uploadProfile,
  uploadProfilePic,
} from "./controllers/imageControllers.js";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth.ts";
import { randomUUID } from "crypto";
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriendsList,
  searchUsers,
  getFriendRequests,
  getUserProfile,
} from "./controllers/friendController.ts";
import bcrypt from "bcrypt";

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
const userSockets = new Map<string, string>();
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

export { io };

// ----------------- REST API -----------------
app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});
// Users
app.post("/users", createUser);

// ----------------- Profile API -----------------

app.get("/api/profile/me", async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.post(
  "/api/normal-signup",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }

      const existing = await dbClient
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // ✅ ถ้ามีผู้ใช้อยู่แล้ว → ลองตรวจรหัสผ่านแทน
      if (existing.length > 0) {
        const existingUser = existing[0];
        if (existingUser.password === null) {
          res.status(400).json({
            error:
              "This account is registered via Google. Please sign in with Google.",
          });
          return;
        }

        const isValid = await bcrypt.compare(password, existingUser.password);
        if (!isValid) {
          res.status(401).json({ error: "Invalid password" });
          return;
        }

        res.status(200).json({
          message: "Login successful",
          user: existingUser,
        });
        return;
      }

      // ✅ สร้าง user ใหม่ (signup)
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = randomUUID();

      const [newUser] = await dbClient
        .insert(users)
        .values({
          id,
          name: name || email.split("@")[0],
          email,
          password: hashedPassword,
          profile_pic: null,
        })
        .returning();

      res.status(201).json({
        message: "Signup success",
        user: newUser,
      });
    } catch (err) {
      console.error("Normal signup failed:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ✅ ตรวจสอบผู้ใช้จาก database โดยตรง (mock login)
app.get("/api/user/check", async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Missing email" });
      return;
    }

    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      res.status(404).json({ exists: false });
    } else {
      res.json({ exists: true, user });
    }
  } catch (err) {
    console.error("Check user failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ✅ ตรวจสอบ user ปัจจุบันจาก session หรือ localStorage
app.get("/api/current-user", async (req, res) => {
  try {
    // ✅ ตรวจสอบจาก Better Auth session ก่อน
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user) {
      const [dbUser] = await dbClient
        .select()
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);

      if (dbUser) {
        res.json({ user: dbUser, source: "better-auth" });
        return;
      }
    }

    // ✅ ถ้าไม่มี session ให้ใช้ query email จาก localStorage
    const email = req.query.email as string;
    if (email) {
      const [dbUser] = await dbClient
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (dbUser) {
        res.json({ user: dbUser, source: "mock" });
        return;
      }
    }

    // ❌ ไม่มีผู้ใช้ใดตรง
    res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put(
  "/api/profile/me",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session?.user) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { name, profile_pic } = req.body;

      // อัปเดตเฉพาะ name / profilePic ในตาราง users
      await dbClient
        .update(users)
        .set({
          name,
          profile_pic,
        })
        .where(eq(users.id, session.user.id));

      // sync กลับไปยัง Better Auth (เฉพาะ name, image)
      await auth.api.updateUser({
        headers: fromNodeHeaders(req.headers),
        body: {
          name,
          image: profile_pic,
        },
      });

      res.json({ success: true, name, profile_pic });
    } catch (err) {
      next(err);
    }
  }
);

app.get("/api/proxy-image", async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing URL" });
      return;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});
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
app.post(
  "/upload/profile-pic",
  uploadProfile.single("image"),
  uploadProfilePic
);

// ----------------- Friend API -----------------
app.get("/api/users/:id/profile", getUserProfile);
app.get("/api/friends/requests", getFriendRequests);
app.post("/api/friends/request", sendFriendRequest);
app.post("/api/friends/accept", acceptFriendRequest);
app.delete("/api/friends/remove", removeFriend);
app.get("/api/friends/list", getFriendsList);
app.get("/api/friends/search", searchUsers);

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
          user: {
            id: users.id,
            name: users.name,
            profilePic: users.profile_pic,
          },
        })
        .from(roomMessages)
        .leftJoin(users, eq(roomMessages.userId, users.id))
        .where(eq(roomMessages.roomId, roomId))
        .orderBy(asc(roomMessages.createdAt));

      const formatted = results.map((row) => ({
        id: row.id,
        message: row.message,
        createdAt: row.createdAt,
        roomId: row.roomId,
        userId: row.userId,
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

  socket.on("set-user-friend", (userId: string) => {
    if (!userId) return;
    userSockets.set(userId, socket.id);
    socket.join(userId);
    console.log(`👤 ${userId} joined socket room (socket: ${socket.id})`);

    // ส่งกลับให้ client รู้ว่าตั้งค่าเรียบร้อย
    socket.emit("friend-connected", { ok: true, userId });
  });

  socket.on("friend-event", (data) => {
    console.log("📨 Friend event received:", data);
  });

  socket.on("set-user", (userId: string) => {
    (socket as any).userId = userId;
    console.log(`Socket ${socket.id} set userId: ${userId}`);
  });

  socket.on("join-room", async (roomId) => {
    socket.join(roomId);

    const newCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    io.emit("room-count-updated", { roomId, count: newCount });

    const socketUserId = (socket as any).userId;
    if (socketUserId) {
      const [user] = await dbClient.query.users.findMany({
        where: eq(users.id, socketUserId),
        limit: 1,
      });

      if (user) {
        await sendSystemMessage(io, roomId, `${user.name} joined the room`);
      }
    }
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
    await broadcastPublicRooms(io);
  });

  socket.on("chat-message", async ({ roomId, userId, message }) => {
    const [msg] = await dbClient
      .insert(roomMessages)
      .values({ roomId, userId, message })
      .returning();

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
            profile_pic: user.profile_pic,
          }
        : undefined,
    });
  });

  socket.on("queue-add", async (payload) => {
    await addToQueue(io, payload);

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

    if (user && queueItem?.song) {
      await sendSystemMessage(
        io,
        payload.roomId,
        `${user.name} removed "${queueItem.song.title}" from queue`
      );
    }
  });

  socket.on("song-ended", async (payload) => {
    console.log("⏹️ song-ended event received from", socket.id);
    const roomId = typeof payload === "string" ? payload : payload?.roomId;
    if (roomId) {
      // ลบเพลงที่เล่นจบแล้วออกจาก queue ก่อน
      const [listening] = await dbClient
        .select({ currentSongId: listeningRooms.currentSongId })
        .from(listeningRooms)
        .where(eq(listeningRooms.id, roomId));

      if (listening?.currentSongId) {
        const [currentItem] = await dbClient
          .select({ id: roomQueue.id })
          .from(roomQueue)
          .where(
            and(
              eq(roomQueue.roomId, roomId),
              eq(roomQueue.songId, listening.currentSongId)
            )
          )
          .orderBy(asc(roomQueue.queueIndex))
          .limit(1);

        if (currentItem) {
          console.log("🗑️ Removing finished song from queue:", currentItem.id);
          await dbClient
            .delete(roomQueue)
            .where(eq(roomQueue.id, currentItem.id));

          // Reindex queue
          const remainingItems = await dbClient
            .select()
            .from(roomQueue)
            .where(eq(roomQueue.roomId, roomId))
            .orderBy(asc(roomQueue.queueIndex));

          await dbClient.transaction(async (tx: any) => {
            for (let i = 0; i < remainingItems.length; i++) {
              await tx
                .update(roomQueue)
                .set({ queueIndex: i })
                .where(eq(roomQueue.id, remainingItems[i].id));
            }
          });
        }
      }

      // จากนั้นค่อยเล่นเพลงถัดไป
      await playNextSong(io, roomId);
    }
  });

  socket.on("skip-song", async (payload) => {
    console.log("⏭️ skip-song event received from", socket.id, payload);

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

      // ลบเพลงที่ skip ออกจาก queue ก่อน
      const [currentItem] = await dbClient
        .select({ id: roomQueue.id })
        .from(roomQueue)
        .where(
          and(
            eq(roomQueue.roomId, payload.roomId),
            eq(roomQueue.songId, listening.currentSongId)
          )
        )
        .orderBy(asc(roomQueue.queueIndex))
        .limit(1);

      if (currentItem) {
        console.log("🗑️ Removing skipped song from queue:", currentItem.id);
        await dbClient
          .delete(roomQueue)
          .where(eq(roomQueue.id, currentItem.id));

        // Reindex queue
        const remainingItems = await dbClient
          .select()
          .from(roomQueue)
          .where(eq(roomQueue.roomId, payload.roomId))
          .orderBy(asc(roomQueue.queueIndex));

        await dbClient.transaction(async (tx: any) => {
          for (let i = 0; i < remainingItems.length; i++) {
            await tx
              .update(roomQueue)
              .set({ queueIndex: i })
              .where(eq(roomQueue.id, remainingItems[i].id));
          }
        });
      }
    }

    const socketUserId = (socket as any).userId;
    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, socketUserId),
      limit: 1,
    });

    if (payload.roomId) {
      // เล่นเพลงถัดไป
      await playNextSong(io, payload.roomId);

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

  socket.on("leave-room", async ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.error("❌ Missing roomId or userId on leave-room");
      return;
    }

    console.log(`👋 User ${userId} leaving room ${roomId}`);

    const [user] = await dbClient.query.users.findMany({
      where: eq(users.id, userId),
      limit: 1,
    });

    socket.leave(roomId);

    // ลบสมาชิกออกจาก database
    await dbClient
      .delete(roomMembers)
      .where(
        and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId))
      );

    const newCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    // อัพเดท count ให้ทุกคน
    io.emit("room-count-updated", { roomId, count: newCount });

    if (user) {
      await sendSystemMessage(io, roomId, `${user.name} left the room`);
    }

    console.log(
      `✅ User ${userId} left room ${roomId} (${newCount} members remaining)`
    );
    // ✅ Broadcast updated room list ทันที
    await broadcastPublicRooms(io);

    // ตรวจสอบและลบห้องถ้าว่าง
    setTimeout(async () => {
      await deleteRoomIfEmpty(io, roomId);
    }, 500);
  });

  socket.on("disconnecting", async () => {
    const roomsToCheck: string[] = [];
    const socketUserId = (socket as any).userId;

    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        roomsToCheck.push(roomId);

        if (socketUserId) {
          await dbClient
            .delete(roomMembers)
            .where(
              and(
                eq(roomMembers.roomId, roomId),
                eq(roomMembers.userId, socketUserId)
              )
            );

          const [user] = await dbClient.query.users.findMany({
            where: eq(users.id, socketUserId),
            limit: 1,
          });

          if (user) {
            await sendSystemMessage(io, roomId, `${user.name} disconnected`);
          }
        }

        const room = io.sockets.adapter.rooms.get(roomId);
        const newCount = room ? room.size - 1 : 0;
        io.emit("room-count-updated", { roomId, count: newCount });
      }
    }

    await broadcastPublicRooms(io);

    setTimeout(async () => {
      for (const roomId of roomsToCheck) {
        await deleteRoomIfEmpty(io, roomId);
      }
    }, 1000);
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of userSockets.entries()) {
      if (sid === socket.id) {
        userSockets.delete(uid);
        console.log(`🔴 ${uid} disconnected`);
        break;
      }
    }
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

// function helper สำหรับลบห้องว่าง
async function deleteRoomIfEmpty(io: any, roomId: string) {
  try {
    const [memberCount] = await dbClient
      .select({ count: sql<number>`count(*)` })
      .from(roomMembers)
      .where(eq(roomMembers.roomId, roomId));

    const dbCount = memberCount?.count || 0;
    const socketCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    //console.log(`🔍 Checking room ${roomId}:`, { dbCount, socketCount });

    if (dbCount === 0 && socketCount === 0) {
      console.log(`🗑️ Deleting empty room: ${roomId}`);

      await dbClient.transaction(async (tx) => {
        await tx.delete(roomQueue).where(eq(roomQueue.roomId, roomId));
        await tx.delete(roomMessages).where(eq(roomMessages.roomId, roomId));
        await tx.delete(roomMembers).where(eq(roomMembers.roomId, roomId));
        await tx.delete(listeningRooms).where(eq(listeningRooms.id, roomId));
      });

      io.emit("room-deleted", { roomId });

      // ✅ Broadcast updated room list
      await broadcastPublicRooms(io);

      console.log(`✅ Room ${roomId} deleted successfully`);
      return true;
    }

    return false;
  } catch (err) {
    console.error(`❌ Error checking/deleting room ${roomId}:`, err);
    return false;
  }
}

// helper function สำหรับ broadcast room list
async function broadcastPublicRooms(io: any) {
  try {
    const rooms = await dbClient.query.listeningRooms.findMany({
      where: (rooms, { eq }) => eq(rooms.isPublic, true),
      columns: {
        id: true,
        name: true,
        description: true,
        inviteCode: true,
        hostId: true,
        maxMembers: true,
        createdAt: true,
      },
    });

    const formattedRooms = await Promise.all(
      rooms.map(async (r) => {
        const [memberCount] = await dbClient
          .select({ count: sql<number>`count(*)` })
          .from(roomMembers)
          .where(eq(roomMembers.roomId, r.id));

        const dbCount = memberCount?.count || 0;
        const socketCount = io.sockets.adapter.rooms.get(r.id)?.size || 0;
        const actualCount = Math.max(dbCount, socketCount);

        return {
          roomId: r.id,
          roomName: r.name,
          description: r.description,
          inviteCode: r.inviteCode,
          hostId: r.hostId,
          createdAt: r.createdAt,
          isPublic: true,
          count: actualCount,
          maxMembers: r.maxMembers || 5,
        };
      })
    );

    // กรองเฉพาะห้องที่มีคน
    const activeRooms = formattedRooms.filter((room) => room.count > 0);

    // ส่ง event ไปยัง clients ทั้งหมด
    io.emit("public-rooms-updated", activeRooms);

    console.log(`📡 Broadcasted ${activeRooms.length} active public rooms`);
    return activeRooms;
  } catch (err) {
    console.error("❌ Error broadcasting public rooms:", err);
    return [];
  }
}

// เพิ่ม scheduled cleanup (optional - สำหรับความแน่ใจเป็นพิเศษ)
setInterval(async () => {
  try {
    //console.log("🧹 Running scheduled room cleanup...");

    const allRooms = await dbClient
      .select({ id: listeningRooms.id })
      .from(listeningRooms);

    let deletedCount = 0;
    for (const room of allRooms) {
      const deleted = await deleteRoomIfEmpty(io, room.id);
      if (deleted) deletedCount++;
    }

    console.log(`✅ Cleanup completed. Deleted ${deletedCount} empty rooms.`);
  } catch (err) {
    console.error("❌ Error in scheduled cleanup:", err);
  }
}, 2 * 60 * 1000); // ทุก 2 นาที

async function sendSystemMessage(io: any, roomId: string, message: string) {
  const [room] = await dbClient
    .select({ id: listeningRooms.id })
    .from(listeningRooms)
    .where(eq(listeningRooms.id, roomId))
    .limit(1);

  if (!room) {
    console.warn("⚠️ Cannot send system message, room not found:", roomId);
    return;
  }

  const systemMsg = {
    userId: "system",
    userName: "System",
    message: message,
    isSystem: true,
    createdAt: new Date(),
  };

  io.to(roomId).emit("chat-message", systemMsg);

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

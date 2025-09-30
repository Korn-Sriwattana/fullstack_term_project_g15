import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import Debug from "debug";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { dbClient as db } from "../db/client.ts";
import {
  table_users, // ใช้ table_users
  friends,
  songs,
  playlists,
  playlistSongs,
  listeningRooms,
  roomMembers,
  roomMessages,
  roomQueue,
  roomSongRequests,
} from "../db/schema.ts";

import { auth } from "../lib/auth.ts";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";

const debug = Debug("proj-backend");
const app = express();
const PORT = process.env.PORT || 3000;

/** Better Auth handler BEFORE JSON middleware (Express v5) */
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

/* -------------------------- helpers -------------------------- */
const parseYouTubeId = (urlOrId: string): string => {
  try {
    // if already looks like an ID, accept
    if (/^[A-Za-z0-9_-]{8,}$/.test(urlOrId)) return urlOrId;
    const u = new URL(urlOrId);
    if (u.hostname.includes("youtube.com"))
      return u.searchParams.get("v") ?? urlOrId;
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    return urlOrId;
  } catch {
    return urlOrId;
  }
};

// POST /auth/signup  {name,email,password} -> {user, token}
app.post("/auth/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!email || !password) throw new Error("email & password required");

    const [user] = await db
      .insert(table_users) // ใช้ table_users
      .values({ name, email, password })
      .onConflictDoNothing({ target: table_users.email })
      .returning();

    // ในโปรดักชันคุณควรใช้ Better Auth จริง ๆ
    res.json({ user, token: "mock-token" });
  } catch (e) {
    next(e);
  }
});

// POST /auth/login  {email,password} -> {user, token}
app.post("/auth/login", async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    const [user] = await db
      .select()
      .from(table_users)
      .where(eq(table_users.email, email)); // ใช้ table_users
    if (!user) return res.status(401).json({ message: "invalid credentials" });
    res.json({ user, token: "mock-token" });
  } catch (e) {
    next(e);
  }
});

// POST /auth/logout -> {success:true}
app.post("/auth/logout", (_req, res) => res.json({ success: true }));

// GET /users/:id -> { id, name, email, profile_pic }
app.get("/users/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const [u] = await db
      .select({
        id: table_users.id, // ใช้ table_users
        name: table_users.name,
        email: table_users.email,
        profile_pic: table_users.profilePic, // ใช้ table_users
      })
      .from(table_users)
      .where(eq(table_users.id, id));
    if (!u) return res.status(404).json({ message: "not found" });
    res.json(u);
  } catch (e) {
    next(e);
  }
});

// PATCH /users/me  { name?, profile_pic? } -> { updatedUser }
app.patch("/users/me", async (req, res, next) => {
  try {
    // ในงานจริงให้เอา userId จาก session; ที่นี่รับมากับ body เพื่อทดสอบง่าย ๆ
    const { id, name, profile_pic } = req.body ?? {};
    if (!id) throw new Error("id required");

    const [updated] = await db
      .update(table_users) // ใช้ table_users
      .set({
        ...(name && { name }),
        ...(profile_pic && { profilePic: profile_pic }), // ใช้ profilePic
      })
      .where(eq(table_users.id, id))
      .returning();

    res.json({ updatedUser: updated });
  } catch (e) {
    next(e);
  }
});

// POST /friends/:userId  body: { friendId } -> {status:"Added"}
app.post("/friends/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { friendId } = req.body ?? {};
    if (!friendId) throw new Error("friendId required");

    await db
      .insert(friends)
      .values({ userId, friendId })
      .onConflictDoNothing({ target: [friends.userId, friends.friendId] });

    res.json({ status: "Added" });
  } catch (e) {
    next(e);
  }
});

// GET /friends -> [{ id, name, status }]
app.get("/friends", async (_req, res, next) => {
  try {
    // รายการเพื่อนทั้งหมด (ทุกคู่) พร้อมชื่อของ friend
    const rows = await db
      .select({
        id: friends.friendId,
        name: table_users.name, // ใช้ table_users
        status: sql<string>`'friend'`,
      })
      .from(friends)
      .leftJoin(table_users, eq(table_users.id, friends.friendId)); // ใช้ table_users
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// POST /songs  { youtubeUrl } -> { song }
app.post("/songs", async (req, res, next) => {
  try {
    const { youtubeUrl } = req.body ?? {};
    if (!youtubeUrl) throw new Error("youtubeUrl required");
    const vid = parseYouTubeId(youtubeUrl);

    const [song] = await db
      .insert(songs)
      .values({ youtubeVideoId: vid })
      .onConflictDoNothing({ target: songs.youtubeVideoId })
      .returning();

    res.json({ song });
  } catch (e) {
    next(e);
  }
});

// GET /songs/:id -> { song }
app.get("/songs/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    if (!song) return res.status(404).json({ message: "not found" });
    res.json({ song });
  } catch (e) {
    next(e);
  }
});

// POST /playlists  { name, description?, is_public?, is_favorite?, cover_url?, ownerId }
app.post("/playlists", async (req, res, next) => {
  try {
    const { name, description, is_public, is_favorite, cover_url, ownerId } =
      req.body ?? {};
    if (!name || !ownerId) throw new Error("name & ownerId required");

    const [playlist] = await db
      .insert(playlists)
      .values({
        name,
        description,
        isPublic: is_public,
        isFavorite: is_favorite ?? false,
        ownerId,
        coverUrl: cover_url,
      })
      .returning();

    res.json({ playlist });
  } catch (e) {
    next(e);
  }
});

// GET /playlists/:id -> { playlist, songs }
app.get("/playlists/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const [pl] = await db.select().from(playlists).where(eq(playlists.id, id));
    if (!pl) return res.status(404).json({ message: "not found" });

    const items = await db
      .select({
        id: songs.id,
        youtubeVideoId: songs.youtubeVideoId,
        title: songs.title,
        artist: songs.artist,
        duration: songs.duration,
        coverUrl: songs.coverUrl,
      })
      .from(playlistSongs)
      .leftJoin(songs, eq(playlistSongs.songId, songs.id))
      .where(eq(playlistSongs.playlistId, id))
      .orderBy(asc(playlistSongs.addedAt));

    res.json({ playlist: pl, songs: items });
  } catch (e) {
    next(e);
  }
});

// GET /playlists/user/:userId -> [ playlists ]
app.get("/playlists/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const rows = await db
      .select()
      .from(playlists)
      .where(eq(playlists.ownerId, userId))
      .orderBy(desc(playlists.createdAt));
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// PATCH /playlists/:id  { name?, is_public?, is_favorite? } -> { updatedPlaylist }
app.patch("/playlists/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, is_public, is_favorite } = req.body ?? {};
    const [updated] = await db
      .update(playlists)
      .set({
        ...(name !== undefined && { name }),
        ...(is_public !== undefined && { isPublic: !!is_public }),
        ...(is_favorite !== undefined && { isFavorite: !!is_favorite }),
      })
      .where(eq(playlists.id, id))
      .returning();
    res.json({ updatedPlaylist: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE /playlists/:id -> { status: success }
app.delete("/playlists/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    await db.delete(playlists).where(eq(playlists.id, id));
    res.json({ status: "success" });
  } catch (e) {
    next(e);
  }
});

app.get("/", (_req, res) => res.send("Hello world 🌍"));

// remaining endpoints ...
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

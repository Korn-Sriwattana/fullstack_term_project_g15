import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* === USERS === */ // ตาราง users สำหรับเก็บข้อมูลผู้ใช้ (สำหรับ better-auth)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* === SESSIONS === */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* === ACCOUNTS === */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* === VERIFICATIONS === */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* USERS */
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  profile_pic: varchar("profile_pic", { length: 255 }),
  password: varchar("password", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .$onUpdate(() => new Date())
    .notNull(),
});

/* FRIENDS (unique คู่ userId, friendId) */
export const friends = pgTable(
  "friends",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    friendId: text("friend_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 20 }) // "pending" | "accepted" | "blocked"
      .default("pending")
      .notNull(),
    requestedBy: text("requested_by") // ใครเป็นคนส่งคำขอ
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userFriendUk: uniqueIndex("friends_user_friend_uk").on(
      t.userId,
      t.friendId
    ),
  })
);

/* PLAYLISTS */
export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isPublic: boolean("is_public").default(true),
    ownerId: text("owner_id") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    coverUrl: varchar("cover_url", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    ownerIdx: index("playlists_owner_idx").on(t.ownerId),
  })
);

/* SONGS */
export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeVideoId: varchar("youtube_video_id", { length: 64 })
    .notNull()
    .unique(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  duration: integer("duration").notNull(),
  coverUrl: varchar("cover_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* PLAYLIST_SONGS */
export const playlistSongs = pgTable(
  "playlist_songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    customOrder: integer("custom_order"),
  },
  (t) => ({
    plSongUk: uniqueIndex("playlist_songs_playlist_song_uk").on(
      t.playlistId,
      t.songId
    ),
    plAddedIdx: index("playlist_songs_pl_added_idx").on(
      t.playlistId,
      t.addedAt
    ),
    plCustomOrderIdx: index("playlist_songs_custom_order_idx").on(
      t.playlistId,
      t.customOrder
    ),
  })
);

/* LISTENING_ROOMS */
export const listeningRooms = pgTable("listening_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: text("host_id") // ✅ เปลี่ยนจาก uuid → text
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  inviteCode: varchar("invite_code", { length: 50 }).unique(),
  maxMembers: integer("max_members").default(5),
  currentSongId: uuid("current_song_id").references(() => songs.id),
  currentStartedAt: timestamp("current_started_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ROOM_MEMBERS */
export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => listeningRooms.id),
    userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 20 }).default("listener").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => ({
    roomUserUk: uniqueIndex("room_members_room_user_uk").on(t.roomId, t.userId),
  })
);

/* ROOM_MESSAGES */
export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => listeningRooms.id),
    userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    roomCreatedIdx: index("room_messages_room_created_idx").on(
      t.roomId,
      t.createdAt
    ),
  })
);

/* ROOM_QUEUE */
export const roomQueue = pgTable(
  "room_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => listeningRooms.id),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id),
    queuedBy: text("queued_by") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    queueIndex: integer("queue_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    roomQueueUk: uniqueIndex("room_queue_room_queueindex_uk").on(
      t.roomId,
      t.queueIndex
    ),
    roomCreatedIdx: index("room_queue_room_created_idx").on(
      t.roomId,
      t.createdAt
    ),
  })
);

/* ROOM_PRESENCE */
export const roomPresence = pgTable(
  "room_presence",
  {
    userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
      .primaryKey()
      .references(() => users.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => listeningRooms.id),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    status: varchar("status", { length: 20 }).default("listening").notNull(),
  },
  (t) => ({
    roomIdx: index("room_presence_room_idx").on(t.roomId),
    lastSeenIdx: index("room_presence_last_seen_idx").on(t.lastSeenAt),
  })
);

/* SONG_STATS */
export const songStats = pgTable("song_stats", {
  songId: uuid("song_id")
    .primaryKey()
    .references(() => songs.id),
  playCount: integer("play_count").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at"),
});

/* PERSONAL_QUEUE */
export const personalQueue = pgTable(
  "personal_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id),
    queueIndex: integer("queue_index").notNull(),
    source: varchar("source", { length: 50 }),
    sourcePlaylistId: uuid("source_playlist_id").references(() => playlists.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userQueueIdx: index("personal_queue_user_queue_idx").on(
      t.userId,
      t.queueIndex
    ),
  })
);

/* PLAYER_STATE */
export const playerState = pgTable("player_state", {
  userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
    .primaryKey()
    .references(() => users.id),
  currentSongId: uuid("current_song_id").references(() => songs.id),
  currentIndex: integer("current_index").default(0),
  currentTime: integer("current_time").default(0),
  isPlaying: boolean("is_playing").default(false),
  repeatMode: varchar("repeat_mode", { length: 10 }).default("off"),
  shuffleMode: boolean("shuffle_mode").default(false),
  shuffledIndices: text("shuffled_indices"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* PLAY_HISTORY */
export const playHistory = pgTable(
  "play_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id),
    playedAt: timestamp("played_at").defaultNow().notNull(),
  },
  (t) => ({
    userPlayedIdx: index("play_history_user_played_idx").on(
      t.userId,
      t.playedAt
    ),
  })
);

/* LIKED_SONGS */
export const likedSongs = pgTable(
  "liked_songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id") // ✅ เปลี่ยนจาก uuid → text
      .notNull()
      .references(() => users.id),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id),
    likedAt: timestamp("liked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userSongUk: uniqueIndex("liked_songs_user_song_uk").on(t.userId, t.songId),
    userLikedIdx: index("liked_songs_user_liked_idx").on(t.userId, t.likedAt),
  })
);

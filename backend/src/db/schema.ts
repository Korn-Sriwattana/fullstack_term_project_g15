import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const table_users = pgTable("table_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }),
  profilePic: varchar("profilePic", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const friends = pgTable("friends", {
  userId: uuid("userId")
    .notNull()
    .references(() => table_users.id, { onDelete: "cascade" }), // ใช้ 'cascade' ตัวเล็ก
  friendId: uuid("friendId")
    .notNull()
    .references(() => table_users.id, { onDelete: "cascade" }), // ใช้ 'cascade' ตัวเล็ก
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  isPublic: boolean("isPublic").default(true), // เพิ่มค่า default เป็น true
  isFavorite: boolean("isFavorite").default(false),
  ownerId: uuid("ownerId").references(() => table_users.id, {
    onDelete: "set null",
  }), // ใช้ 'set null' ตัวเล็ก
  coverUrl: varchar("coverUrl", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeVideoId: varchar("youtubeVideoId", { length: 255 }).unique().notNull(),
  title: varchar("title", { length: 255 }),
  artist: varchar("artist", { length: 255 }),
  duration: integer("duration").default(0), // เพิ่มค่า default สำหรับ duration
  coverUrl: varchar("coverUrl", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const playlistSongs = pgTable(
  "playlist_songs",
  {
    playlistId: uuid("playlistId").references(() => playlists.id),
    songId: uuid("songId").references(() => songs.id),
    addedAt: timestamp("addedAt", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    uniq: { unique: [table.playlistId, table.songId] },
  })
);

export const listeningRooms = pgTable("listening_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("hostId").references(() => table_users.id, {
    onDelete: "set null",
  }), // ใช้ 'set null' ตัวเล็ก
  name: varchar("name", { length: 255 }),
  isPublic: boolean("isPublic").default(true),
  inviteCode: varchar("inviteCode", { length: 255 }).unique(),
  maxMembers: integer("maxMembers").default(5),
  currentSongId: uuid("currentSongId").references(() => songs.id, {
    onDelete: "set null",
  }), // ใช้ 'set null' ตัวเล็ก
  currentStartedAt: timestamp("currentStartedAt", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("roomId").references(() => listeningRooms.id),
    userId: uuid("userId").references(() => table_users.id), // ใช้ table_users
    role: varchar("role", { length: 50 }).default("listener"),
    joinedAt: timestamp("joinedAt", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    uniq: { unique: [table.roomId, table.userId] },
  })
);

export const roomMessages = pgTable("room_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("roomId").references(() => listeningRooms.id),
  userId: uuid("userId").references(() => table_users.id), // ใช้ table_users
  message: text("message"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const roomQueue = pgTable(
  "room_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("roomId").references(() => listeningRooms.id),
    songId: uuid("songId").references(() => songs.id),
    queuedBy: uuid("queuedBy").references(() => table_users.id), // ใช้ table_users
    queueIndex: integer("queueIndex"),
    createdAt: timestamp("createdAt", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqIndex: { unique: [table.roomId, table.queueIndex] },
    idxRoomCreated: { index: [table.roomId, table.createdAt] },
  })
);

export const roomSongRequests = pgTable("room_song_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("roomId").references(() => listeningRooms.id),
  requesterId: uuid("requesterId").references(() => table_users.id), // ใช้ table_users
  youtubeVideoId: varchar("youtubeVideoId", { length: 255 }),
  note: varchar("note", { length: 255 }), // ไม่มีการใช้ nullable() เนื่องจากค่าปกติจะเป็น nullable
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export const roomPresence = pgTable("room_presence", {
  userId: uuid("userId")
    .primaryKey()
    .references(() => table_users.id), // ใช้ table_users
  roomId: uuid("roomId").references(() => listeningRooms.id),
  joinedAt: timestamp("joinedAt", { mode: "string" }).defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt", { mode: "string" })
    .defaultNow()
    .notNull(),
  status: varchar("status", { length: 50 }).default("listening"),
});

export const songStats = pgTable("song_stats", {
  songId: uuid("songId")
    .primaryKey()
    .references(() => songs.id),
  playCount: integer("playCount").default(0),
  communityPlayCount: integer("communityPlayCount").default(0),
  personalPlayCount: integer("personalPlayCount").default(0),
  lastPlayedAt: timestamp("lastPlayedAt", { mode: "string" }),
});

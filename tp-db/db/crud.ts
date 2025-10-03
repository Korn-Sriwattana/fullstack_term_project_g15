import { dbClient } from "@db/client.js";
import * as schema from "@db/schema.js";
import { eq, and, sql } from "drizzle-orm";

/* ================= USERS ================= */
export const createUser = (data: {
  name: string; email: string; password: string; profilePic?: string;
}) =>
  dbClient.insert(schema.users).values(data).returning();

export const getAllUsers = () => dbClient.query.users.findMany();

export const getUserById = (id: string) =>
  dbClient.query.users.findFirst({ where: eq(schema.users.id, id) });

export const updateUser = (id: string, data: Partial<{ name: string; profilePic: string }>) =>
  dbClient.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();

export const deleteUser = (id: string) =>
  dbClient.delete(schema.users).where(eq(schema.users.id, id));

/* ================= FRIENDS ================= */
export const addFriend = (userId: string, friendId: string) =>
  dbClient.insert(schema.friends).values({ userId, friendId }).returning();

export const getFriends = (userId: string) =>
  dbClient.query.friends.findMany({ where: eq(schema.friends.userId, userId) });

export const removeFriend = (userId: string, friendId: string) =>
  dbClient.delete(schema.friends).where(
    and(eq(schema.friends.userId, userId), eq(schema.friends.friendId, friendId))
  );

/* ================= PLAYLISTS ================= */
export const createPlaylist = (data: {
  name: string; description?: string; isPublic?: boolean; isFavorite?: boolean;
  ownerId: string; coverUrl?: string;
}) => dbClient.insert(schema.playlists).values(data).returning();

export const getUserPlaylists = (ownerId: string) =>
  dbClient.query.playlists.findMany({ where: eq(schema.playlists.ownerId, ownerId) });

export const updatePlaylist = (id: string, data: Partial<{ name: string; description: string; isFavorite: boolean }>) =>
  dbClient.update(schema.playlists).set(data).where(eq(schema.playlists.id, id)).returning();

export const deletePlaylist = (id: string) =>
  dbClient.delete(schema.playlists).where(eq(schema.playlists.id, id));

/* ================= SONGS ================= */
export const createSong = (data: {
  youtubeVideoId: string; title: string; artist?: string; duration: number; coverUrl?: string;
}) => dbClient.insert(schema.songs).values(data).returning();

export const getSongByYoutubeId = (videoId: string) =>
  dbClient.query.songs.findFirst({ where: eq(schema.songs.youtubeVideoId, videoId) });

/* ================= PLAYLIST SONGS ================= */
export const addSongToPlaylist = (playlistId: string, songId: string) =>
  dbClient.insert(schema.playlistSongs).values({ playlistId, songId }).returning();

export const removeSongFromPlaylist = (playlistId: string, songId: string) =>
  dbClient.delete(schema.playlistSongs).where(
    and(eq(schema.playlistSongs.playlistId, playlistId), eq(schema.playlistSongs.songId, songId))
  );

/* ================= LISTENING ROOMS ================= */
export const createRoom = (data: {
  hostId: string; name: string; isPublic?: boolean; inviteCode?: string; maxMembers?: number;
}) => dbClient.insert(schema.listeningRooms).values(data).returning();

export const getPublicRooms = () =>
  dbClient.query.listeningRooms.findMany({ where: eq(schema.listeningRooms.isPublic, true) });

export const updateRoomSong = (roomId: string, songId: string) =>
  dbClient.update(schema.listeningRooms).set({
    currentSongId: songId,
    currentStartedAt: new Date(),
  }).where(eq(schema.listeningRooms.id, roomId));

/* ================= ROOM MEMBERS ================= */
export const addRoomMember = (roomId: string, userId: string, role: string = "listener") =>
  dbClient.insert(schema.roomMembers).values({ roomId, userId, role }).returning();

export const removeRoomMember = (roomId: string, userId: string) =>
  dbClient.delete(schema.roomMembers).where(
    and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.userId, userId))
  );

/* ================= ROOM MESSAGES ================= */
export const addRoomMessage = (roomId: string, userId: string, message: string) =>
  dbClient.insert(schema.roomMessages).values({ roomId, userId, message }).returning();

export const getRoomMessages = (roomId: string) =>
  dbClient.query.roomMessages.findMany({ where: eq(schema.roomMessages.roomId, roomId) });

/* ================= ROOM QUEUE ================= */
export const addSongToRoomQueue = (roomId: string, songId: string, queuedBy: string, queueIndex: number) =>
  dbClient.insert(schema.roomQueue).values({ roomId, songId, queuedBy, queueIndex }).returning();

export const removeSongFromRoomQueue = (roomId: string, queueIndex: number) =>
  dbClient.delete(schema.roomQueue).where(
    and(eq(schema.roomQueue.roomId, roomId), eq(schema.roomQueue.queueIndex, queueIndex))
  );

/* ================= ROOM SONG REQUESTS ================= */
export const requestSong = (roomId: string, requesterId: string, youtubeVideoId: string, note?: string) =>
  dbClient.insert(schema.roomSongRequests).values({ roomId, requesterId, youtubeVideoId, note }).returning();

export const updateSongRequestStatus = (id: string, status: "pending" | "approved" | "rejected") =>
  dbClient.update(schema.roomSongRequests).set({ status }).where(eq(schema.roomSongRequests.id, id));

/* ================= ROOM PRESENCE ================= */
export const updateRoomPresence = (userId: string, roomId: string, status: "listening" | "idle") =>
  dbClient.insert(schema.roomPresence).values({
    userId, roomId, status, lastSeenAt: new Date(),
  }).onConflictDoUpdate({
    target: schema.roomPresence.userId,
    set: { roomId, status, lastSeenAt: new Date() },
  });

/* ================= SONG STATS ================= */
export const incrementSongPlayCount = (songId: string) =>
  dbClient.update(schema.songStats)
    .set({ playCount: sql`${schema.songStats.playCount} + 1` })
    .where(eq(schema.songStats.songId, songId));

export const incrementCommunityPlayCount = (songId: string) =>
  dbClient.update(schema.songStats)
    .set({ communityPlayCount: sql`${schema.songStats.communityPlayCount} + 1` })
    .where(eq(schema.songStats.songId, songId));

export const incrementPersonalPlayCount = (songId: string) =>
  dbClient.update(schema.songStats)
    .set({ personalPlayCount: sql`${schema.songStats.personalPlayCount} + 1` })
    .where(eq(schema.songStats.songId, songId));

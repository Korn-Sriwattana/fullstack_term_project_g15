// import { randomUUID } from "node:crypto";
// import { eq, desc, and, sql } from "drizzle-orm";
// import { dbClient, dbConn } from "@db/client.js";
// import * as schema from "@db/schema.js";

// // helpers
// const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// const rand = (p = "") => `${p}${Math.random().toString(36).slice(2, 8)}`;

// async function main() {
//   console.log("🚀 Start DB smoke test");

//   // ---------- USERS ----------
//   console.log("\n👤 Create users");
//   const [u1] = await dbClient
//     .insert(schema.users)
//     .values({
//       name: `Alice_${rand()}`,
//       email: `alice_${rand()}@example.com`,
//       password: "hash_pw_1",
//       profilePic: "https://picsum.photos/seed/alice/200/200",
//     })
//     .returning();

//   const [u2] = await dbClient
//     .insert(schema.users)
//     .values({
//       name: `Bob_${rand()}`,
//       email: `bob_${rand()}@example.com`,
//       password: "hash_pw_2",
//       profilePic: "https://picsum.photos/seed/bob/200/200",
//     })
//     .returning();

//   console.log("  -> users:", u1.id, u2.id);

//   console.log("\n🤝 Add friends (both directions)");
//   await dbClient.insert(schema.friends).values({ userId: u1.id, friendId: u2.id });
//   await dbClient.insert(schema.friends).values({ userId: u2.id, friendId: u1.id });

//   const friendsOfU1 = await dbClient.query.friends.findMany({
//     where: eq(schema.friends.userId, u1.id),
//   });
//   console.log("  -> friendsOfU1:", friendsOfU1.length);

//   // ---------- SONGS ----------
//   console.log("\n🎵 Create songs");
//   const [s1] = await dbClient
//     .insert(schema.songs)
//     .values({
//       youtubeVideoId: `yt_${rand()}`,
//       title: "Song One",
//       artist: "Artist A",
//       duration: 210,
//       coverUrl: "https://picsum.photos/seed/song1/300/300",
//     })
//     .returning();

//   const [s2] = await dbClient
//     .insert(schema.songs)
//     .values({
//       youtubeVideoId: `yt_${rand()}`,
//       title: "Song Two",
//       artist: "Artist B",
//       duration: 180,
//       coverUrl: "https://picsum.photos/seed/song2/300/300",
//     })
//     .returning();

//   console.log("  -> songs:", s1.id, s2.id);

//   // seed song_stats rows (ถ้ายังไม่มี)
//   await dbClient
//     .insert(schema.songStats)
//     .values([{ songId: s1.id }, { songId: s2.id }])
//     .onConflictDoNothing();

//   // ---------- PLAYLISTS ----------
//   console.log("\n📻 Create playlist & add songs");
//   const [pl] = await dbClient
//     .insert(schema.playlists)
//     .values({
//       name: `My Mix ${rand()}`,
//       description: "Auto test playlist",
//       isPublic: true,
//       ownerId: u1.id,
//       coverUrl: "https://picsum.photos/seed/playlist/400/200",
//     })
//     .returning();

//   await dbClient.insert(schema.playlistSongs).values([
//     { playlistId: pl.id, songId: s1.id },
//     { playlistId: pl.id, songId: s2.id },
//   ]);

//   const plSongs = await dbClient.query.playlistSongs.findMany({
//     where: eq(schema.playlistSongs.playlistId, pl.id),
//   });
//   console.log("  -> playlist:", pl.id, " songs:", plSongs.length);

//   // ---------- ROOMS ----------
//   console.log("\n🏠 Create room, members, messages");
//   const [room] = await dbClient
//     .insert(schema.listeningRooms)
//     .values({
//       hostId: u1.id,
//       name: `Room ${rand("#")}`,
//       isPublic: true,
//       inviteCode: rand("INV_"),
//       maxMembers: 5,
//     })
//     .returning();

//   await dbClient.insert(schema.roomMembers).values([
//     { roomId: room.id, userId: u1.id, role: "host" },
//     { roomId: room.id, userId: u2.id, role: "listener" },
//   ]);

//   await dbClient.insert(schema.roomMessages).values([
//     { roomId: room.id, userId: u1.id, message: "Welcome!" },
//     { roomId: room.id, userId: u2.id, message: "Hi there 👋" },
//   ]);

//   const msgs = await dbClient.query.roomMessages.findMany({
//     where: eq(schema.roomMessages.roomId, room.id),
//   });
//   console.log("  -> room:", room.id, " messages:", msgs.length);

//   // ---------- ROOM QUEUE ----------
//   console.log("\n📼 Room queue add + remove");
//   // next queue index = 0,1
//   const [qi1] = await dbClient
//     .insert(schema.roomQueue)
//     .values({
//       roomId: room.id,
//       songId: s1.id,
//       queuedBy: u1.id,
//       queueIndex: 0,
//     })
//     .returning();
//   const [qi2] = await dbClient
//     .insert(schema.roomQueue)
//     .values({
//       roomId: room.id,
//       songId: s2.id,
//       queuedBy: u2.id,
//       queueIndex: 1,
//     })
//     .returning();

//   const queueBefore = await dbClient.query.roomQueue.findMany({
//     where: eq(schema.roomQueue.roomId, room.id),
//     orderBy: (t, { asc }) => asc(t.queueIndex),
//   });
//   console.log("  -> queue size before:", queueBefore.length);

//   // remove item with queueIndex = 0, then shift others -1
//   await dbClient.transaction(async (tx) => {
//     await tx
//       .delete(schema.roomQueue)
//       .where(and(eq(schema.roomQueue.roomId, room.id), eq(schema.roomQueue.queueIndex, 0)));
//     // shift remaining
//     await tx.execute(sql`
//       UPDATE room_queue
//       SET queue_index = queue_index - 1
//       WHERE room_id = ${room.id} AND queue_index > 0
//     `);
//   });

//   const queueAfter = await dbClient.query.roomQueue.findMany({
//     where: eq(schema.roomQueue.roomId, room.id),
//     orderBy: (t, { asc }) => asc(t.queueIndex),
//   });
//   console.log("  -> queue size after:", queueAfter.length, "first index:", queueAfter[0]?.queueIndex);

//   // ---------- SONG REQUESTS ----------
//   console.log("\n🙏 Song requests");
//   const [req1] = await dbClient
//     .insert(schema.roomSongRequests)
//     .values({
//       roomId: room.id,
//       requesterId: u2.id,
//       youtubeVideoId: `yt_${rand("req_")}`,
//       note: "please play this",
//     })
//     .returning();

//   await dbClient
//     .update(schema.roomSongRequests)
//     .set({ status: "approved" })
//     .where(eq(schema.roomSongRequests.id, req1.id));

//   const reqs = await dbClient.query.roomSongRequests.findMany({
//     where: eq(schema.roomSongRequests.roomId, room.id),
//   });
//   console.log("  -> requests:", reqs.length, "first status:", reqs[0]?.status);

//   // ---------- PRESENCE ----------
//   console.log("\n🟢 Presence join + heartbeat");
//   // upsert presence (PK = userId)
//   await dbClient
//     .insert(schema.roomPresence)
//     .values({ userId: u1.id, roomId: room.id, status: "listening" })
//     .onConflictDoUpdate({
//       target: schema.roomPresence.userId,
//       set: { roomId: room.id, status: "listening", lastSeenAt: new Date() },
//     });

//   await dbClient
//     .insert(schema.roomPresence)
//     .values({ userId: u2.id, roomId: room.id, status: "listening" })
//     .onConflictDoUpdate({
//       target: schema.roomPresence.userId,
//       set: { roomId: room.id, status: "listening", lastSeenAt: new Date() },
//     });

//   // heartbeat
//   await sleep(200);
//   await dbClient
//     .update(schema.roomPresence)
//     .set({ lastSeenAt: new Date() })
//     .where(eq(schema.roomPresence.userId, u2.id));

//   const pres = await dbClient.query.roomPresence.findMany({
//     where: eq(schema.roomPresence.roomId, room.id),
//   });
//   console.log("  -> presence count:", pres.length);

//   // ---------- NOW PLAYING + STATS ----------
//   console.log("\n⏯️ Update now playing + increment stats");
//   await dbClient
//     .update(schema.listeningRooms)
//     .set({ currentSongId: s1.id, currentStartedAt: new Date() })
//     .where(eq(schema.listeningRooms.id, room.id));

//   await dbClient
//     .update(schema.songStats)
//     .set({
//       playCount: sql`${schema.songStats.playCount} + 1`,
//       communityPlayCount: sql`${schema.songStats.communityPlayCount} + 1`,
//       lastPlayedAt: new Date(),
//     })
//     .where(eq(schema.songStats.songId, s1.id));

//   const top = await dbClient
//     .select({
//       songId: schema.songs.id,
//       title: schema.songs.title,
//       plays: schema.songStats.playCount,
//     })
//     .from(schema.songStats)
//     .innerJoin(schema.songs, eq(schema.songs.id, schema.songStats.songId))
//     .orderBy((t) => desc(schema.songStats.playCount))
//     .limit(5);

//   console.log("  -> top songs (by play_count):", top);

//   // ---------- CLEANUP (optional) ----------
//   console.log("\n🧹 Cleanup created data");
//   await dbClient.delete(schema.roomPresence).where(eq(schema.roomPresence.roomId, room.id));
//   await dbClient.delete(schema.roomSongRequests).where(eq(schema.roomSongRequests.roomId, room.id));
//   await dbClient.delete(schema.roomQueue).where(eq(schema.roomQueue.roomId, room.id));
//   await dbClient.delete(schema.roomMessages).where(eq(schema.roomMessages.roomId, room.id));
//   await dbClient.delete(schema.roomMembers).where(eq(schema.roomMembers.roomId, room.id));
//   await dbClient.delete(schema.listeningRooms).where(eq(schema.listeningRooms.id, room.id));

//   await dbClient.delete(schema.playlistSongs).where(eq(schema.playlistSongs.playlistId, pl.id));
//   await dbClient.delete(schema.playlists).where(eq(schema.playlists.id, pl.id));

//   await dbClient.delete(schema.songStats).where(
//     and(
//       orEq(schema.songStats.songId, s1.id, s2.id) // helper ด้านล่าง
//     )
//   );

//   await dbClient.delete(schema.songs).where(
//     and(
//       orEq(schema.songs.id, s1.id, s2.id)
//     )
//   );

//   await dbClient.delete(schema.friends).where(eq(schema.friends.userId, u1.id));
//   await dbClient.delete(schema.friends).where(eq(schema.friends.userId, u2.id));

//   await dbClient.delete(schema.users).where(eq(schema.users.id, u1.id));
//   await dbClient.delete(schema.users).where(eq(schema.users.id, u2.id));

//   console.log("\n✅ DONE");

//   // ปิดคอนเนกชัน postgres-js
//   await dbConn.end({ timeout: 5 });
// }

// // small helper สำหรับ WHERE id IN (...)
// function orEq<T>(col: T, ...ids: string[]) {
//   // drizzle ไม่มี helper or/any ตรง ๆ กับ array ในทุก dialect เลยใช้ sql แบบง่าย
//   return sql`${col} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
// }

// main().catch(async (err) => {
//   console.error("❌ Error:", err);
//   try {
//     await dbConn.end({ timeout: 5 });
//   } catch {}
//   process.exit(1);
// });

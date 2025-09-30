import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  table_users,
  friends,
  songs,
  playlists,
  playlistSongs,
  listeningRooms,
  roomMembers,
  roomMessages,
  roomQueue,
  roomSongRequests,
} from "../db/schema.ts"; // นำเข้า schema จากไฟล์ db/schema.ts

const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
    ssl: true,
  },
});

async function main() {
  console.log("🌱 Seeding data...");

  // --- Users ---
  const [alice, bob] = await db
    .insert(table_users)
    .values([
      {
        name: "Alice",
        email: "alice@example.com",
        password: "password123",
        profilePic: "https://i.pravatar.cc/150?img=1",
      },
      {
        name: "Bob",
        email: "bob@example.com",
        password: "password123",
        profilePic: "https://i.pravatar.cc/150?img=2",
      },
    ])
    .onConflictDoNothing({ target: table_users.email })
    .returning();

  // --- Friends ---
  await db.insert(friends).values([
    { userId: alice.id, friendId: bob.id },
    { userId: bob.id, friendId: alice.id },
  ]);

  // --- Songs ---
  const [song1, song2] = await db
    .insert(songs)
    .values([
      {
        youtubeVideoId: "dQw4w9WgXcQ",
        title: "Never Gonna Give You Up",
        artist: "Rick Astley",
        duration: 212,
        coverUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      },
      {
        youtubeVideoId: "3JZ_D3ELwFQ",
        title: "Shape of You",
        artist: "Ed Sheeran",
        duration: 233,
        coverUrl: "https://i.ytimg.com/vi/3JZ_D3ELwFQ/hqdefault.jpg",
      },
    ])
    .onConflictDoNothing({ target: songs.youtubeVideoId })
    .returning();

  // --- Playlists ---
  const [playlist1, playlist2] = await db
    .insert(playlists)
    .values([
      {
        name: "My Favorite Songs",
        description: "A collection of my favorite songs",
        isPublic: true,
        isFavorite: true,
        ownerId: alice.id,
        coverUrl: "https://example.com/cover1.jpg",
      },
      {
        name: "Chill Vibes",
        description: "Songs to relax and unwind",
        isPublic: false,
        isFavorite: false,
        ownerId: bob.id,
        coverUrl: "https://example.com/cover2.jpg",
      },
    ])
    .returning();

  // --- Playlist Songs ---
  await db.insert(playlistSongs).values([
    { playlistId: playlist1.id, songId: song1.id },
    { playlistId: playlist1.id, songId: song2.id },
    { playlistId: playlist2.id, songId: song1.id },
  ]);

  // --- Listening Rooms ---
  const [room1, room2] = await db
    .insert(listeningRooms)
    .values([
      {
        hostId: alice.id,
        name: "Alice's Room",
        isPublic: true,
        inviteCode: "ROOM1",
        maxMembers: 5,
      },
      {
        hostId: bob.id,
        name: "Bob's Room",
        isPublic: false,
        inviteCode: "ROOM2",
        maxMembers: 5,
      },
    ])
    .returning();

  // --- Room Members ---
  await db.insert(roomMembers).values([
    { roomId: room1.id, userId: alice.id, role: "host" },
    { roomId: room1.id, userId: bob.id, role: "listener" },
    { roomId: room2.id, userId: bob.id, role: "host" },
    { roomId: room2.id, userId: alice.id, role: "listener" },
  ]);

  // --- Room Messages ---
  await db.insert(roomMessages).values([
    { roomId: room1.id, userId: alice.id, message: "Welcome to my room!" },
    {
      roomId: room1.id,
      userId: bob.id,
      message: "Hey Alice, thanks for inviting me!",
    },
    { roomId: room2.id, userId: bob.id, message: "Hello, Alice!" },
    { roomId: room2.id, userId: alice.id, message: "Hi Bob, nice to be here!" },
  ]);

  // --- Room Queue ---
  await db.insert(roomQueue).values([
    { roomId: room1.id, songId: song1.id, queuedBy: alice.id, queueIndex: 0 },
    { roomId: room1.id, songId: song2.id, queuedBy: bob.id, queueIndex: 1 },
    { roomId: room2.id, songId: song1.id, queuedBy: bob.id, queueIndex: 0 },
  ]);

  // --- Room Song Requests ---
  await db.insert(roomSongRequests).values([
    {
      roomId: room1.id,
      requesterId: alice.id,
      youtubeVideoId: "dQw4w9WgXcQ",
      note: "Play this classic!",
    },
    {
      roomId: room2.id,
      requesterId: bob.id,
      youtubeVideoId: "3JZ_D3ELwFQ",
      note: "Let's enjoy some Ed Sheeran!",
    },
  ]);

  console.log("🌱 Seeding completed!");
}

main()
  .catch((err) => {
    console.error("Error seeding data:", err);
  })
  .finally(() => {
    db.$client.end();
  });

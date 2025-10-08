import { dbClient } from "../db/client.ts"; // Assume dbClient is correctly set up
import {
  users,
  friends,
  playlists,
  songs,
  playlistSongs,
  listeningRooms,
  roomMembers,
  roomMessages,
  roomQueue,
  roomPresence,
  songStats,
  personalQueue,
  playerState,
  playHistory,
} from "../db/schema.ts";
import { uuid } from "drizzle-orm/pg-core";

// Sample function to create mock data for each table
async function createSeedData() {
  // Create Users
  const user1 = await dbClient
    .insert(users)
    .values({
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      password: "password123",
      profilePic: "https://example.com/avatar1.png",
    })
    .returning();

  const user2 = await dbClient
    .insert(users)
    .values({
      name: "Bob Smith",
      email: "bob.smith@example.com",
      password: "password456",
      profilePic: "https://example.com/avatar2.png",
    })
    .returning();

  // Create Songs
  const song1 = await dbClient
    .insert(songs)
    .values({
      youtubeVideoId: "abcd1234",
      title: "Song 1",
      artist: "Artist A",
      duration: 180, // 3 minutes
      coverUrl: "https://example.com/song1-cover.jpg",
    })
    .returning();

  const song2 = await dbClient
    .insert(songs)
    .values({
      youtubeVideoId: "efgh5678",
      title: "Song 2",
      artist: "Artist B",
      duration: 240, // 4 minutes
      coverUrl: "https://example.com/song2-cover.jpg",
    })
    .returning();

  // Create Playlists
  const playlist1 = await dbClient
    .insert(playlists)
    .values({
      name: "Chill Beats",
      description: "Relaxing and calm beats",
      isPublic: true,
      isFavorite: true,
      ownerId: user1[0].id,
      coverUrl: "https://example.com/chill-beats-cover.jpg",
    })
    .returning();

  const playlist2 = await dbClient
    .insert(playlists)
    .values({
      name: "Workout Mix",
      description: "Energetic songs for workouts",
      isPublic: true,
      isFavorite: false,
      ownerId: user2[0].id,
      coverUrl: "https://example.com/workout-mix-cover.jpg",
    })
    .returning();

  // Add Songs to Playlists
  await dbClient.insert(playlistSongs).values({
    playlistId: playlist1[0].id,
    songId: song1[0].id,
  });

  await dbClient.insert(playlistSongs).values({
    playlistId: playlist2[0].id,
    songId: song2[0].id,
  });

  // Create Friends
  await dbClient.insert(friends).values({
    userId: user1[0].id,
    friendId: user2[0].id,
  });

  // Create Listening Rooms
  const room1 = await dbClient
    .insert(listeningRooms)
    .values({
      hostId: user1[0].id,
      name: "Chill Room",
      description: "A room for relaxing music",
      isPublic: true,
      inviteCode: "chillroom123",
      maxMembers: 10,
      currentSongId: song1[0].id,
    })
    .returning();

  const room2 = await dbClient
    .insert(listeningRooms)
    .values({
      hostId: user2[0].id,
      name: "Workout Room",
      description: "A room for high energy music",
      isPublic: true,
      inviteCode: "workoutroom456",
      maxMembers: 10,
      currentSongId: song2[0].id,
    })
    .returning();

  // Add Users to Rooms
  await dbClient.insert(roomMembers).values({
    roomId: room1[0].id,
    userId: user1[0].id,
    role: "host",
  });

  await dbClient.insert(roomMembers).values({
    roomId: room2[0].id,
    userId: user2[0].id,
    role: "host",
  });

  // Add Room Messages
  await dbClient.insert(roomMessages).values({
    roomId: room1[0].id,
    userId: user1[0].id,
    message: "Welcome to the Chill Room!",
  });

  await dbClient.insert(roomMessages).values({
    roomId: room2[0].id,
    userId: user2[0].id,
    message: "Welcome to the Workout Room!",
  });

  // Add Room Queue
  await dbClient.insert(roomQueue).values({
    roomId: room1[0].id,
    songId: song1[0].id,
    queuedBy: user1[0].id,
    queueIndex: 1,
  });

  // Add Player State
  await dbClient.insert(playerState).values({
    userId: user1[0].id,
    currentSongId: song1[0].id,
    currentIndex: 1,
    currentTime: 0,
    isPlaying: true,
    repeatMode: "off",
    shuffleMode: false,
    shuffledIndices: "[]",
  });

  console.log("Seed data created successfully!");
}

createSeedData().catch((err) => console.error("Error seeding data:", err));

import "dotenv/config";
import fs from "fs";
import path from "path";
import { dbClient } from "./client.ts";
import {
  users,
  songs,
  playlists,
  playlistSongs,
  listeningRooms,
  roomMembers,
  likedSongs,
  songStats,
  friends,
} from "./schema.ts";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

// ----------------------------------------------------
// 🖼️ คัดลอกรูป seed-image → uploads/
// ----------------------------------------------------
function copySeedImages() {
  const seedDir = "./seed-image";
  const destProfiles = "./uploads/profile-pics";
  const destCovers = "./uploads/playlist-covers";

  if (!fs.existsSync(seedDir)) {
    console.warn("⚠️ seed-image directory not found, skipping image copy");
    return;
  }

  fs.mkdirSync(destProfiles, { recursive: true });
  fs.mkdirSync(destCovers, { recursive: true });

  const images = fs
    .readdirSync(seedDir)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  if (images.length === 0) {
    console.warn("⚠️ No images found in seed-image/");
    return;
  }

  const pick = (index: number) =>
    path.join(seedDir, images[index % images.length]);

  // 👤 profile pics
  const profileTargets = [
    { dest: "alice.png", src: pick(0) },
    { dest: "bob.png", src: pick(1) },
    { dest: "charlie.png", src: pick(2) },
  ];

  for (const file of profileTargets) {
    const destPath = path.join(destProfiles, file.dest);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(file.src, destPath);
      console.log(`🖼️ Copied ${path.basename(file.src)} → ${file.dest}`);
    }
  }

  // 🎨 playlist covers (dummy01–dummy10)
  const coverTargets = Array.from({ length: 10 }, (_, i) => ({
    dest: `dummy${String(i + 1).padStart(2, "0")}.png`,
    src: pick(i),
  }));

  for (const file of coverTargets) {
    const destPath = path.join(destCovers, file.dest);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(file.src, destPath);
      console.log(`🖼️ Copied ${path.basename(file.src)} → ${file.dest}`);
    }
  }
}

// ----------------------------------------------------
// 🌱 SEED FUNCTION
// ----------------------------------------------------
async function seed() {
  console.log("🌱 Starting idempotent database seeding...\n");
  copySeedImages();

  // 🔐 Passwords
  const passwordAlice = await bcrypt.hash("a1234", 10);
  const passwordBob = await bcrypt.hash("b1234", 10);
  const passwordCharlie = await bcrypt.hash("c1234", 10);

  // ---------------- USERS ----------------
  const baseUsers = [
    {
      name: "Alice",
      email: "alice@example.com",
      password: passwordAlice,
      profilePic: "/uploads/profile-pics/alice.png",
    },
    {
      name: "Bob",
      email: "bob@example.com",
      password: passwordBob,
      profilePic: "/uploads/profile-pics/bob.png",
    },
    {
      name: "Charlie",
      email: "charlie@example.com",
      password: passwordCharlie,
      profilePic: "/uploads/profile-pics/charlie.png",
    },
  ];

  const userMap: Record<string, string> = {};
  for (const u of baseUsers) {
    const existing = await dbClient
      .select()
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);
    if (existing.length === 0) {
      const [inserted] = await dbClient
        .insert(users)
        .values({
          id: randomUUID(),
          name: u.name,
          email: u.email,
          password: u.password,
          profilePic: u.profilePic,
        })
        .returning();
      userMap[u.email] = inserted.id;
      console.log(`👤 Created user: ${u.email}`);
    } else {
      userMap[u.email] = existing[0].id;
      console.log(`✅ User exists: ${u.email}`);
    }
  }

  // ---------------- SONGS ----------------
  const songList = [
    {
      youtubeVideoId: "L051YSpEEYU",
      title: "ที่คั่นหนังสือ (Sometimes)",
      artist: "BOWKYLION Ft. NONT TANONT",
      duration: 326,
      coverUrl: "https://i.ytimg.com/vi/L051YSpEEYU/hqdefault.jpg",
    },
    {
      youtubeVideoId: "LmZD-TU96q4",
      title: "IRIS OUT",
      artist: "Kenshi Yonezu (米津玄師)",
      duration: 154,
      coverUrl: "https://i.ytimg.com/vi/LmZD-TU96q4/hqdefault.jpg",
    },
    {
      youtubeVideoId: "42wfEs7oIP8",
      title: "FaSHioN",
      artist: "CORTIS (HYBE LABELS)",
      duration: 180,
      coverUrl: "https://i.ytimg.com/vi/42wfEs7oIP8/hqdefault.jpg",
    },
    {
      youtubeVideoId: "kxopViU98Xo",
      title: "Lover Boy 88",
      artist: "Alxie Buanos",
      duration: 214,
      coverUrl: "https://i.ytimg.com/vi/kxopViU98Xo/hqdefault.jpg",
    },
    {
      youtubeVideoId: "3AtDnEC4zak",
      title: "Shape of You",
      artist: "Ed Sheeran",
      duration: 263,
      coverUrl: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    },
    {
      youtubeVideoId: "HgzGwKwLmgM",
      title: "Don't Stop Me Now",
      artist: "Queen",
      duration: 210,
      coverUrl: "https://i.ytimg.com/vi/HgzGwKwLmgM/hqdefault.jpg",
    },
  ];

  const songMap: Record<string, string> = {};
  for (const s of songList) {
    const existing = await dbClient
      .select()
      .from(songs)
      .where(eq(songs.youtubeVideoId, s.youtubeVideoId))
      .limit(1);
    if (existing.length === 0) {
      const [inserted] = await dbClient.insert(songs).values(s).returning();
      songMap[s.youtubeVideoId] = inserted.id;
      console.log(`🎵 Added song: ${s.title}`);
    } else {
      songMap[s.youtubeVideoId] = existing[0].id;
      console.log(`✅ Song exists: ${s.title}`);
    }
  }

  // ---------------- SONG STATS ----------------
  for (const id of Object.values(songMap)) {
    const existing = await dbClient
      .select()
      .from(songStats)
      .where(eq(songStats.songId, id))
      .limit(1);
    if (existing.length === 0) {
      await dbClient.insert(songStats).values({
        songId: id,
        playCount: Math.floor(Math.random() * 50) + 1,
        lastPlayedAt: new Date(),
      });
      console.log(`📊 Stats created for song ID: ${id}`);
    }
  }

  // ---------------- PLAYLISTS (2 per user) ----------------
  const basePlaylists = [
    // Alice
    {
      name: "Morning Soft",
      description: "Breezy acoustic and lo-fi songs ☀️",
      ownerEmail: "alice@example.com",
      coverUrl: "/uploads/playlist-covers/dummy01.png",
      songs: ["kxopViU98Xo", "L051YSpEEYU", "3AtDnEC4zak"],
    },
    {
      name: "Focus Beats",
      description: "Calm study session playlist 🎧",
      ownerEmail: "alice@example.com",
      coverUrl: "/uploads/playlist-covers/dummy02.png",
      songs: ["LmZD-TU96q4", "42wfEs7oIP8"],
    },

    // Bob
    {
      name: "Workout Energy",
      description: "Run faster, lift stronger 💪",
      ownerEmail: "bob@example.com",
      coverUrl: "/uploads/playlist-covers/dummy03.png",
      songs: ["HgzGwKwLmgM", "3AtDnEC4zak"],
    },
    {
      name: "Night Drive",
      description: "Songs for your midnight ride 🌙",
      ownerEmail: "bob@example.com",
      coverUrl: "/uploads/playlist-covers/dummy04.png",
      songs: ["L051YSpEEYU", "kxopViU98Xo"],
    },

    // Charlie
    {
      name: "Chillwave Mix",
      description: "Electronic calmness and vibes 💫",
      ownerEmail: "charlie@example.com",
      coverUrl: "/uploads/playlist-covers/dummy05.png",
      songs: ["42wfEs7oIP8", "LmZD-TU96q4"],
    },
    {
      name: "Retro Vibes",
      description: "Oldies but goldies ✨",
      ownerEmail: "charlie@example.com",
      coverUrl: "/uploads/playlist-covers/dummy06.png",
      songs: ["HgzGwKwLmgM", "kxopViU98Xo", "3AtDnEC4zak"],
    },
  ];

  const playlistMap: Record<string, string> = {};
  for (const pl of basePlaylists) {
    const ownerId = userMap[pl.ownerEmail];
    const existing = await dbClient
      .select()
      .from(playlists)
      .where(eq(playlists.name, pl.name))
      .limit(1);

    let playlistId: string;
    if (existing.length === 0) {
      const [inserted] = await dbClient
        .insert(playlists)
        .values({
          id: randomUUID(),
          name: pl.name,
          description: pl.description,
          ownerId,
          coverUrl: pl.coverUrl,
          isPublic: true,
        })
        .returning();
      playlistId = inserted.id;
      console.log(`🎧 Created playlist: ${pl.name}`);
    } else {
      playlistId = existing[0].id;
      console.log(`✅ Playlist exists: ${pl.name}`);
    }

    playlistMap[pl.name] = playlistId;

    // Add songs into each playlist
    let order = 1;
    for (const vid of pl.songs) {
      const songId = songMap[vid];
      const exist = await dbClient
        .select()
        .from(playlistSongs)
        .where(eq(playlistSongs.playlistId, playlistId))
        .limit(1);
      if (exist.length === 0) {
        await dbClient.insert(playlistSongs).values({
          playlistId,
          songId,
          customOrder: order++,
        });
      }
    }
  }

  // ---------------- FRIENDS ----------------
  const aliceId = userMap["alice@example.com"];
  const bobId = userMap["bob@example.com"];
  const charlieId = userMap["charlie@example.com"];

  const existingFriends = await dbClient
    .select()
    .from(friends)
    .where(eq(friends.userId, aliceId));

  if (existingFriends.length === 0) {
    await dbClient.insert(friends).values([
      {
        userId: aliceId,
        friendId: bobId,
        requestedBy: aliceId,
        status: "accepted",
      },
      {
        userId: aliceId,
        friendId: charlieId,
        requestedBy: aliceId,
        status: "pending",
      },
    ]);
    console.log("🤝 Friends seeded for Alice");
  } else {
    console.log("✅ Friends already exist for Alice");
  }

  // ---------------- LIKED SONGS ----------------
  const liked = [
    { userEmail: "alice@example.com", youtubeVideoId: "L051YSpEEYU" },
    { userEmail: "bob@example.com", youtubeVideoId: "HgzGwKwLmgM" },
    { userEmail: "charlie@example.com", youtubeVideoId: "42wfEs7oIP8" },
  ];

  for (const l of liked) {
    const userId = userMap[l.userEmail];
    const songId = songMap[l.youtubeVideoId];
    const existing = await dbClient
      .select()
      .from(likedSongs)
      .where(eq(likedSongs.userId, userId))
      .limit(1);
    if (existing.length === 0) {
      await dbClient.insert(likedSongs).values({ userId, songId });
      console.log(`💖 Added liked song for ${l.userEmail}`);
    }
  }

  // ---------------- LISTENING ROOMS ----------------
  const roomTemplate = (
    hostName: string,
    hostId: string,
    publicSongId?: string
  ) => [
    {
      name: `${hostName}’s Public Lounge`,
      description: `Welcome to ${hostName}’s chill zone 🎶`,
      isPublic: true,
      inviteCode: randomUUID().replace(/-/g, "").slice(0, 8),
      hostId,
      maxMembers: 10,
      currentSongId: publicSongId || null,
      currentStartedAt: new Date(),
    },
    {
      name: `${hostName}’s Private Room`,
      description: `${hostName}’s personal space 🔒`,
      isPublic: false,
      inviteCode: randomUUID().replace(/-/g, "").slice(0, 8),
      hostId,
      maxMembers: 5,
      currentSongId: null,
    },
  ];

  const allRooms = [
    ...roomTemplate("Alice", aliceId, songMap["L051YSpEEYU"]),
    ...roomTemplate("Bob", bobId, songMap["HgzGwKwLmgM"]),
    ...roomTemplate("Charlie", charlieId, songMap["42wfEs7oIP8"]),
  ];

  for (const room of allRooms) {
    const existing = await dbClient
      .select()
      .from(listeningRooms)
      .where(eq(listeningRooms.name, room.name))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await dbClient
        .insert(listeningRooms)
        .values({
          id: randomUUID(),
          ...room,
        })
        .returning({ id: listeningRooms.id });

      // เพิ่ม host เข้าเป็นสมาชิก
      await dbClient.insert(roomMembers).values({
        roomId: inserted.id,
        userId: room.hostId,
        role: "host",
      });

      console.log(
        `🏠 Created room: ${room.name} (${
          room.isPublic ? "Public" : "Private"
        })`
      );
    } else {
      console.log(`✅ Room exists: ${room.name}`);
    }
  }

  console.log("\n✅seeding completed successfully!");
  process.exit(0);
}

// ----------------------------------------------------
seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

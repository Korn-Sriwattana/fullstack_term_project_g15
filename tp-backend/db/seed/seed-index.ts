import "dotenv/config";
import { copySeedImages } from "./seed-data/copy-images.seed.js";
import { seedUsers } from "./seed-data/users.seed.js";
import { seedSongs } from "./seed-data/songs.seed.js";
import { seedPlaylists } from "./seed-data/playlists.seed.js";
import { seedFriends } from "./seed-data/friends.seed.js";
import { seedLikedSongs } from "./seed-data/liked-songs.seed.js";
import { seedRooms } from "./seed-data/rooms.seed.js";
import { seedSongStats } from "./seed-data/song-stats.seed.js";

async function main() {
  console.log("🌱 Starting structured seed process...\n");

  await copySeedImages();
  console.log("Finished copying seed images\n");

  const userMap = await seedUsers();
  console.log("Finished seeding users\n");

  const songMap = await seedSongs();
  console.log("Finished seeding songs\n");

  await seedPlaylists(userMap, songMap);
  console.log("Finished seeding playlists\n");

  await seedSongStats(songMap);
  console.log("Finished seeding song stats\n");

  await seedFriends(userMap);
  console.log("Finished seeding friends\n");

  await seedLikedSongs(userMap, songMap);
  console.log("Finished seeding liked songs\n");

  await seedRooms(userMap, songMap);
  console.log("Finished seeding listening rooms\n");

  console.log("\n🎉 All seeding tasks completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

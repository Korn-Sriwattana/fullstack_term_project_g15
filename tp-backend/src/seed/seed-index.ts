import "dotenv/config";
import { copySeedImages } from "./seed-data/copy-images.seed.ts";
import { seedUsers } from "./seed-data/users.seed.ts";
import { seedSongs } from "./seed-data/songs.seed.ts";
import { seedPlaylists } from "./seed-data/playlists.seed.ts";
import { seedFriends } from "./seed-data/friends.seed.ts";
import { seedLikedSongs } from "./seed-data/liked-songs.seed.ts";
import { seedSongStats } from "./seed-data/song-stats.seed.ts";

async function main() {
  console.log("🌱 Starting structured seed process...\n");

  await copySeedImages();
  const userMap = await seedUsers();
  const songMap = await seedSongs();
  await seedPlaylists(userMap, songMap);
  await seedSongStats(songMap);
  await seedFriends(userMap);
  await seedLikedSongs(userMap, songMap);
  console.log("\n🎉 All seeding tasks completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

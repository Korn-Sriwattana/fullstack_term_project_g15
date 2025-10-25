import fs from "fs";
import path from "path";
import { dbClient } from "../../../db/client.js";
import { friends } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

export async function seedFriends(userMap: Record<string, string>) {
  const dataPath = path.resolve("./data/friends.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ friends.json not found at ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const friendPairs = JSON.parse(fileContent);

  for (const f of friendPairs) {
    const userId = userMap[f.userEmail];
    const friendId = userMap[f.friendEmail];
    const requestedBy = userMap[f.requestedBy];

    if (!userId || !friendId || !requestedBy) {
      console.warn(
        `⚠️ Missing user mapping for ${f.userEmail} or ${f.friendEmail}, skipping`
      );
      continue;
    }

    const existing = await dbClient
      .select()
      .from(friends)
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)))
      .limit(1);

    if (existing.length === 0) {
      await dbClient.insert(friends).values({
        userId,
        friendId,
        requestedBy,
        status: f.status,
      });
      console.log(`🤝 Added friend: ${f.userEmail} ↔ ${f.friendEmail}`);
    } else {
      console.log(`✅ Already friends: ${f.userEmail} & ${f.friendEmail}`);
    }
  }

  console.log("Finished seeding friends\n");
}

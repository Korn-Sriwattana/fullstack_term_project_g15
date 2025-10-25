import { dbClient } from "../../../db/client.ts";
import { friends } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";

export async function seedFriends(userMap: Record<string, string>) {
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
  console.log("Finished seeding friends\n");
}

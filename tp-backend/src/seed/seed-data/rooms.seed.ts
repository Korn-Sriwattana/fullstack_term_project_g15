import { dbClient } from "../../../db/client.ts";
import { listeningRooms, roomMembers } from "../../../db/schema.ts";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

export async function seedRooms(
  userMap: Record<string, string>,
  songMap: Record<string, string>
) {
  const aliceId = userMap["alice@example.com"];
  const bobId = userMap["bob@example.com"];
  const charlieId = userMap["charlie@example.com"];

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
}

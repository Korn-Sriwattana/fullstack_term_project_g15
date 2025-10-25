import { dbClient } from "../../../db/client.ts";
import { users } from "../../../db/schema.ts";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export async function seedUsers() {
  const baseUsers = [
    {
      name: "Alice",
      email: "alice@example.com",
      password: "a1234",
      profile_pic: "/uploads/profile-pics/alice.png",
    },
    {
      name: "Bob",
      email: "bob@example.com",
      password: "b1234",
      profile_pic: "/uploads/profile-pics/bob.png",
    },
    {
      name: "Charlie",
      email: "charlie@example.com",
      password: "c1234",
      profile_pic: "/uploads/profile-pics/charlie.png",
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
      const hashed = await bcrypt.hash(u.password, 10);
      const [inserted] = await dbClient
        .insert(users)
        .values({
          id: randomUUID(),
          name: u.name,
          email: u.email,
          password: hashed,
          profile_pic: u.profile_pic,
        })
        .returning();
      userMap[u.email] = inserted.id;
      console.log(`👤 Created user: ${u.email}`);
    } else {
      userMap[u.email] = existing[0].id;
      console.log(`✅ User exists: ${u.email}`);
    }
  }
  console.log("Finished seeding users\n");
  return userMap;
}

import fs from "fs";
import path from "path";
import { dbClient } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export async function seedUsers() {
  const dataPath = path.resolve("data/users.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ users.json not found at ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const baseUsers = JSON.parse(fileContent);

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

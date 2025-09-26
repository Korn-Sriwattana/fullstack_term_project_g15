import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { usersTable } from "./schema.ts";
import { eq } from "drizzle-orm";

const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
    ssl: true,
  },
});

async function main() {
  const user: typeof usersTable.$inferInsert = {
    name: "John",
    email: "john@example.com",
  };

  await db.insert(usersTable).values(user);
  console.log("✅ User created");

  const users = await db.select().from(usersTable);
  console.log("📦 Users: ", users);

  await db
    .update(usersTable)
    .set({ name: "Johnny" })
    .where(eq(usersTable.email, user.email));
  console.log("✏️ User updated");

  //   await db.delete(usersTable).where(eq(usersTable.email, user.email));
  //   console.log("🗑 User deleted");
}

main();

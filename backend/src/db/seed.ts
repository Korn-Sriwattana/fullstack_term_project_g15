import "dotenv/config";
import { dbClient } from "./client";
import { usersTable } from "./schema";

async function seed() {
  // ลบข้อมูลเก่าออกก่อน (optional)
  await dbClient.delete(usersTable);

  // ข้อมูลตัวอย่าง 5 คน
  const users = [
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
    { name: "Charlie", email: "charlie@example.com" },
    { name: "Diana", email: "diana@example.com" },
    { name: "Ethan", email: "ethan@example.com" },
  ];

  // insert users
  const result = await dbClient.insert(usersTable).values(users).returning({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
  });

  console.log("✅ Seed completed!");
  console.table(result);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed error:", err);
    process.exit(1);
  });

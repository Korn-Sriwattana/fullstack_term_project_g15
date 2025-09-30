// backend/src/db/index.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import {} from "./schema.ts";

export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
    ssl: true,
  },
});

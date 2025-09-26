import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.ts";
import postgres from "postgres";
import { connectionString } from "./utils.ts";

export const dbConn = postgres(connectionString);
export const dbClient = drizzle(dbConn, { schema, logger: true });

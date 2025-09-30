import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbClient } from "../db/client.ts"; // drizzle instance
import * as authSchema from "./auth-schema.ts";

export const auth = betterAuth({
  database: drizzleAdapter(dbClient, {
    provider: "pg", // เราใช้ postgres
    schema: authSchema,
  }),

  // เปิด Email + Password ก็ได้
  emailAndPassword: {
    enabled: true,
  },

  // Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "select_account",
    },
  },
});

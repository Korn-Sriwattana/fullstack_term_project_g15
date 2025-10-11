// src/lib/auth.ts (หรือที่คุณตั้ง)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbClient as db } from "./db/client.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // เปิดใช้ Google Sign-in
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline", // ขอ refresh token
      prompt: "select_account consent", // ให้เลือกบัญชีทุกครั้ง
    },
  },

  // เปิดใช้งาน email/password ด้วย (ถ้าต้องการ)
  emailAndPassword: {
    enabled: true,
  },
});

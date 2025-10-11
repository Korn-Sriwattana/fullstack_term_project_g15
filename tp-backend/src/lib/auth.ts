// src/lib/auth.ts (หรือที่คุณตั้ง)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbClient as db } from "../../db/client.ts";
import { users } from "../../db/schema.ts";
import { eq } from "drizzle-orm";

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

  databaseHooks: {
    user: {
      create: {
        after: async (newUser, ctx) => {
          try {
            // ตรวจว่ามีอยู่แล้วในตาราง users หรือยัง
            const existing = await db
              .select()
              .from(users)
              .where(eq(users.email, newUser.email));

            if (existing.length === 0) {
              await db.insert(users).values({
                id: newUser.id, // ใช้ id เดียวกับ Better Auth
                name: newUser.name,
                email: newUser.email,
                profilePic: newUser.image,
              });
              console.log(
                "✅ Synced new user to app users table:",
                newUser.email
              );
            }
          } catch (err) {
            console.error("❌ Failed to sync user:", err);
          }
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:5173", // frontend dev
    "http://localhost:3000", // backend (เผื่อกรณี server-side call)
  ],
  // เปิดใช้งาน email/password ด้วย (ถ้าต้องการ)
  emailAndPassword: {
    enabled: true,
  },
});

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbClient as db } from "../../db/client.ts";
import { users } from "../../db/schema.ts";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },

  databaseHooks: {
    user: {
      create: {
        // ✅ ทุกครั้งที่ Google OAuth สร้าง user ใหม่
        // ให้ตรวจสอบ email ก่อน ถ้าไม่มีให้สร้างใหม่
        // ถ้ามีแล้ว — ใช้ของเดิม ไม่ต้องสร้างซ้ำ
        after: async (newUser, ctx) => {
          try {
            const [existing] = await db
              .select()
              .from(users)
              .where(eq(users.email, newUser.email))
              .limit(1);

            if (!existing) {
              // ✅ ยังไม่เคยมี → สร้างบัญชีใหม่
              await db.insert(users).values({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                profilePic: newUser.image,
              });
              console.log("✅ Created new user:", newUser.email);
            } else {
              // ✅ ถ้ามีอยู่แล้ว — ไม่ต้องสร้างซ้ำ
              console.log("ℹ️ Existing user found:", newUser.email);
            }
          } catch (err) {
            console.error("❌ Failed to create/sync user:", err);
          }
        },
      },

      update: {
        // ✅ จำกัดให้แก้ไขได้เฉพาะ name, image เท่านั้น
        before: async (data, ctx) => {
          const allowed = ["name", "image"];
          const filtered: Record<string, any> = {};
          for (const key of allowed) {
            if (data[key] !== undefined) filtered[key] = data[key];
          }
          return { data: filtered };
        },
      },
    },
  },

  trustedOrigins: ["http://localhost:5173", "http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
  },
});

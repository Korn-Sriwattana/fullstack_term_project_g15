// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbClient as db } from "../../db/client.ts";
import { users } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  advanced: {
    database: {
<<<<<<< HEAD
      generateId: () => randomUUID(), // ✅ ใช้ฟังก์ชันสร้าง UUID
=======
      generateId: () => randomUUID(),
>>>>>>> origin/main
    },
  },

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
<<<<<<< HEAD
        // ✅ ทุกครั้งที่ Google OAuth สร้าง user ใหม่
        // ให้ตรวจสอบ email ก่อน ถ้าไม่มีให้สร้างใหม่
        // ถ้ามีแล้ว — ใช้ของเดิม ไม่ต้องสร้างซ้ำ
=======
>>>>>>> origin/main
        after: async (newUser, ctx) => {
          try {
            const [existing] = await db
              .select()
              .from(users)
              .where(eq(users.email, newUser.email))
              .limit(1);
<<<<<<< HEAD

            if (!existing) {
              // ✅ ยังไม่เคยมี → สร้างบัญชีใหม่
=======
          // ✅ แปลง URL เป็นขนาดใหญ่ก่อนเก็บ
          let profilePic = newUser.image;
          if (profilePic?.includes("googleusercontent.com")) {
            profilePic = profilePic.replace(/=s\d+-c$/, "=s500");
          }

            if (!existing) {
              // ✅ สร้างบัญชีใหม่ พร้อม copy รูปจาก Google
>>>>>>> origin/main
              await db.insert(users).values({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
<<<<<<< HEAD
                profilePic: newUser.image,
              });
              console.log("✅ Created new user:", newUser.email);
            } else {
              // ✅ ถ้ามีอยู่แล้ว — ไม่ต้องสร้างซ้ำ
              console.log("ℹ️ Existing user found:", newUser.email);
=======
                profilePic: newUser.image, // ✅ copy รูปจาก Google OAuth
              });
              console.log("✅ Created new user with profile pic:", newUser.email);
            } else {
              // ✅ ถ้ามีอยู่แล้ว แต่ไม่มีรูป → อัปเดตรูปจาก Google
              if (!existing.profilePic && newUser.image) {
                await db
                  .update(users)
                  .set({ profilePic: newUser.image })
                  .where(eq(users.id, existing.id));
                console.log("✅ Updated profile pic for existing user:", newUser.email);
              }
>>>>>>> origin/main
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
<<<<<<< HEAD
=======
        
        // ✅ หลังจาก Better Auth update → sync ไปยัง users table ด้วย
        after: async (updatedUser, ctx) => {
          try {
            if (updatedUser.image !== undefined) {
              await db
                .update(users)
                .set({ profilePic: updatedUser.image })
                .where(eq(users.id, updatedUser.id));
              console.log("✅ Synced profile pic to users table:", updatedUser.email);
            }
          } catch (err) {
            console.error("❌ Failed to sync profile pic:", err);
          }
        },
>>>>>>> origin/main
      },
    },
  },

  trustedOrigins: ["http://localhost:5173", "http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> origin/main

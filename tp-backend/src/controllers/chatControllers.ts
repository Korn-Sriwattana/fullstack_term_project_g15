import type { Request, Response } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { roomMessages } from "@db/schema.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Get messages for a room
export const getRoomMessages = async (req: Request, res: Response) => {
  // กำหนดประเภทของ params ให้ชัดเจน
  const { roomId } = req.params as { roomId: string }; // การกำหนด type ให้ `roomId`
  
  try {
    // ใช้ eq() ในการกรองข้อมูลที่ตรงกับ roomId
    const messages = await db
      .select()
      .from(roomMessages)
      .where(eq(roomMessages.roomId, roomId));  // ใช้ eq() ที่นี่
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Post a new message
export const postRoomMessage = async (req: Request, res: Response) => {
  // กำหนดประเภทข้อมูลใน `req.body`
  const { roomId, userId, message } = req.body as { roomId: string; userId: string; message: string };

  try {
    // ตรวจสอบว่าทุกค่านั้นมีข้อมูลหรือไม่
    if (!roomId || !userId || !message) {
      throw new Error("Missing required fields");
    }

    // ใช้ insert() ในการบันทึกข้อมูลใหม่
    const newMessage = await db
      .insert(roomMessages)
      .values({ roomId, userId, message })
      .returning();
    
    res.json(newMessage[0]);  // ส่งข้อความใหม่ที่ถูกบันทึก
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
};

import type { RequestHandler } from "express";
import { dbClient } from "../../db/client.js";
import { friends, users } from "../../db/schema.js";
import { or, and, eq, ilike, not } from "drizzle-orm";

/* ส่งคำขอเป็นเพื่อน */
export const sendFriendRequest: RequestHandler = async (req, res) => {
  const { userId, friendId } = req.body;

  if (userId === friendId) {
    res.status(400).json({ error: "You cannot add yourself." });
    return;
  }

  const existing = await dbClient
    .select()
    .from(friends)
    .where(
      or(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, userId))
      )
    );

  if (existing.length > 0) {
    res.status(400).json({ error: "Friend request already exists." });
    return;
  }

  await dbClient.insert(friends).values({
    userId,
    friendId,
    requestedBy: userId,
    status: "pending",
  });

  res.json({ message: "Friend request sent." });
};

/* ยอมรับคำขอ */
export const acceptFriendRequest: RequestHandler = async (req, res) => {
  const { userId, friendId } = req.body;

  await dbClient
    .update(friends)
    .set({ status: "accepted" })
    .where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)));

  res.json({ message: "Friend request accepted." });
};

/* ยกเลิกคำขอ / ลบเพื่อน */
export const removeFriend: RequestHandler = async (req, res) => {
  const { userId, friendId } = req.body;

  await dbClient
    .delete(friends)
    .where(
      or(
        and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, userId))
      )
    );

  res.json({ message: "Friend removed." });
};

/* ดึงรายชื่อเพื่อน */
export const getFriendsList: RequestHandler = async (req, res) => {
  const { userId } = req.query;

  const rows = await dbClient
    .select()
    .from(friends)
    .where(
      and(
        or(
          eq(friends.userId, userId as string),
          eq(friends.friendId, userId as string)
        ),
        eq(friends.status, "accepted")
      )
    );

  res.json({ friends: rows });
};

/* 🔍 ค้นหาผู้ใช้จาก prefix ของ email (เช่น soy100) */
export const searchUsers: RequestHandler = async (req, res) => {
  const { query, userId } = req.query;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  // ตัด @... ออกหากผู้ใช้ใส่มาเต็ม
  const keyword = query.split("@")[0];

  // หา user ที่ email เริ่มด้วย prefix นี้
  const result = await dbClient
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      profilePic: users.profilePic,
    })
    .from(users)
    .where(
      and(
        ilike(users.email, `${keyword}%`),
        not(eq(users.id, userId as string)) // ห้ามค้นหาตัวเอง
      )
    );

  // หา friend status ของแต่ละคน (pending, accepted, none)
  const userList = [];
  for (const u of result) {
    const friendship = await dbClient
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.userId, userId as string), eq(friends.friendId, u.id)),
          and(eq(friends.userId, u.id), eq(friends.friendId, userId as string))
        )
      );

    let status = "none";
    if (friendship.length > 0) {
      status = friendship[0].status;
      if (status === "pending") {
        status =
          friendship[0].requestedBy === userId ? "requested" : "incoming";
      }
    }

    userList.push({ ...u, status });
  }

  res.json({ users: userList });
};

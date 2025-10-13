import type { RequestHandler } from "express";
import { dbClient } from "../../db/client.js";
import { friends, users } from "../../db/schema.js";
import { or, and, eq, ilike, not } from "drizzle-orm";
import { io, notifyFriendAccepted } from "../index.js";

/* 📥 ดึงคำขอเพื่อนที่ส่งมาหา user */
export const getFriendRequests: RequestHandler = async (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  // ดึงคำขอที่ยัง pending และ friendId คือ user นี้
  const requests = await dbClient
    .select({
      userId: friends.userId,
      friendId: friends.friendId,
      requestedBy: friends.requestedBy,
      status: friends.status,
      createdAt: friends.createdAt,
      requester: {
        id: users.id,
        name: users.name,
        profilePic: users.profilePic,
      },
    })
    .from(friends)
    .leftJoin(users, eq(users.id, friends.requestedBy))
    .where(
      and(eq(friends.friendId, userId), eq(friends.status, "pending"))
    );

  res.json({ requests });
};


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

  // ✅ แจ้งแบบ realtime ให้ฝั่ง friendId
  io.to(friendId).emit("friend-updated", {
    type: "incoming-request",
    from: userId,
  });

  res.json({ message: "Friend request sent." });
};


/* ยอมรับคำขอ */
export const acceptFriendRequest: RequestHandler = async (req, res) => {
  const { userId, friendId } = req.body;

  if (!userId || !friendId) {
    res.status(400).json({ error: "Missing userId or friendId" });
    return;
  }

  // ✅ ตรวจว่ามีคำขอ pending จริงไหม
  const [existing] = await dbClient
    .select()
    .from(friends)
    .where(
      and(
        eq(friends.userId, friendId),
        eq(friends.friendId, userId),
        eq(friends.status, "pending")
      )
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Friend request not found" });
    return;
  }

  // ✅ อัปเดตสถานะเป็น accepted
  await dbClient
    .update(friends)
    .set({ status: "accepted" })
    .where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)));

  res.json({ message: "Friend request accepted." });
  notifyFriendAccepted(userId, friendId);
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
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  // ดึงเพื่อนทุกคน (ฝั่ง accepted)
  const rows = await dbClient
    .select({
      id: users.id,
      name: users.name,
      profilePic: users.profilePic,
      userId: friends.userId,
      friendId: friends.friendId,
    })
    .from(friends)
    .innerJoin(
      users,
      or(eq(users.id, friends.userId), eq(users.id, friends.friendId))
    )
    .where(
      and(
        or(eq(friends.userId, userId), eq(friends.friendId, userId)),
        eq(friends.status, "accepted")
      )
    );

  // ✅ กรองตัวเองออก + return เฉพาะข้อมูล user ของเพื่อน
  const filtered = rows.filter((r) => r.id !== userId);

  res.json({ friends: filtered });
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

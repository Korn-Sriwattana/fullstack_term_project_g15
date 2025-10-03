import type { RequestHandler } from "express";
import { randomUUID } from "crypto";
import { dbClient } from "@db/client.js";
import { listeningRooms, roomMembers } from "@db/schema.js";
import { eq, and } from "drizzle-orm";

// Create Room
export const createRoom: RequestHandler = async (req, res, next) => {
  try {
    const { hostId, name, description, isPublic } = req.body as {
      hostId?: string;
      name?: string;
      description?: string;
      isPublic?: boolean;
    };

    if (!hostId || !name?.trim()) {
      res.status(400).json({ error: "Missing hostId or room name" });
      return;
    }

    const inviteCode = randomUUID().replace(/-/g, "").slice(0, 8);

    const [room] = await dbClient
      .insert(listeningRooms)
      .values({
        hostId,
        name,
        description: description || null,
        inviteCode,
        isPublic: isPublic ?? true,
      })
      .returning({
        id: listeningRooms.id,
        name: listeningRooms.name,
        description: listeningRooms.description,
        inviteCode: listeningRooms.inviteCode,
        isPublic: listeningRooms.isPublic,
      });

    // ✅ auto add host to roomMembers
    await dbClient.insert(roomMembers).values({
      roomId: room.id,
      userId: hostId,
      role: 'host',
    });


    req.app.locals.io.emit("room-created", {
      roomId: room.id,
      roomName: room.name,
      description: room.description,
      inviteCode: room.inviteCode,
      isPublic: room.isPublic,
    });


    res.status(201).json({
      roomId: room.id,
      roomName: room.name,
      description: room.description,
      inviteCode: room.inviteCode,
      isPublic: room.isPublic,
    });
  } catch (err) {
    next(err);
  }
};


// Join Room
export const joinRoom: RequestHandler = async (req, res, next) => {
  try {
    const { inviteCode, userId } = req.body as {
      inviteCode?: string;
      userId?: string;
    };

    if (!inviteCode || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [room] = await dbClient
      .select()
      .from(listeningRooms)
      .where(eq(listeningRooms.inviteCode, inviteCode));

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // check membership
    const [member] = await dbClient
      .select()
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, userId)));

    if (!member) {
      const role = userId === room.hostId ? 'host' : 'listener';
      
      await dbClient.insert(roomMembers).values({
        roomId: room.id,
        userId,
        role,
      });
    }

    res.json({
    message: member ? "Already joined" : "Joined successfully",
    roomId: room.id,
    roomName: room.name,
    description: room.description,
    inviteCode: room.inviteCode,
    isPublic: room.isPublic,  
  });
  } catch (err) {
    next(err);
  }
};

// List Public Rooms
export const listPublicRooms: RequestHandler = async (req, res, next) => {
  try {
    const rooms = await dbClient.query.listeningRooms.findMany({
      where: (rooms, { eq }) => eq(rooms.isPublic, true),
      columns: {
        id: true,
        name: true,
        description: true,
        inviteCode: true,
        hostId: true,
        createdAt: true,
      },
    });

    // ใช้ socket.io adapter ดึงจำนวนคนในแต่ละห้อง
    const io = req.app.locals.io;

    const formattedRooms = rooms.map((r) => {
      const count = io.sockets.adapter.rooms.get(r.id)?.size || 0;
      return {
        roomId: r.id,
        roomName: r.name,
        description: r.description,
        inviteCode: r.inviteCode,
        hostId: r.hostId,
        createdAt: r.createdAt,
        isPublic: true,
        count,
      };
    });

    res.json(formattedRooms);
  } catch (err) {
    next(err);
  }
};
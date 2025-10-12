import type { RequestHandler } from "express";
import { randomUUID } from "crypto";
import { dbClient } from "@db/client.js";
import { listeningRooms, roomMembers, roomQueue, roomMessages } from "@db/schema.js";
import { eq, and, count, sql } from "drizzle-orm";

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

    // Auto add host to roomMembers
    await dbClient.insert(roomMembers).values({
      roomId: room.id,
      userId: hostId,
      role: 'host',
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

    // Check if user is already a member
    const [member] = await dbClient
      .select()
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, userId)));

    if (member) {
      // Already joined
      res.json({
        message: "Already joined",
        roomId: room.id,
        roomName: room.name,
        description: room.description,
        inviteCode: room.inviteCode,
        isPublic: room.isPublic,
      });
      return;
    }

    // Check current member count
    const [memberCount] = await dbClient
      .select({ count: count() })
      .from(roomMembers)
      .where(eq(roomMembers.roomId, room.id));

    const currentCount = memberCount?.count || 0;
    const maxMembers = room.maxMembers || 5;

    if (currentCount >= maxMembers) {
      res.status(403).json({ 
        error: "Room is full",
        maxMembers,
        currentCount 
      });
      return;
    }

    // Add user to room
    const role = userId === room.hostId ? 'host' : 'listener';

    await dbClient.insert(roomMembers).values({
      roomId: room.id,
      userId,
      role,
    });

    res.json({
      message: "Joined successfully",
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
    // ปิด cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const rooms = await dbClient.query.listeningRooms.findMany({
      where: (rooms, { eq }) => eq(rooms.isPublic, true),
      columns: {
        id: true,
        name: true,
        description: true,
        inviteCode: true,
        hostId: true,
        maxMembers: true,
        createdAt: true,
      },
    });

    const io = req.app.locals.io;

    const formattedRooms = await Promise.all(
      rooms.map(async (r) => {
        // Get actual member count from database
        const [memberCount] = await dbClient
          .select({ count: count() })
          .from(roomMembers)
          .where(eq(roomMembers.roomId, r.id));

        const dbCount = memberCount?.count || 0;
        const socketCount = io.sockets.adapter.rooms.get(r.id)?.size || 0;
        
        // Use the higher of the two counts for accuracy
        const actualCount = Math.max(dbCount, socketCount);

        return {
          roomId: r.id,
          roomName: r.name,
          description: r.description,
          inviteCode: r.inviteCode,
          hostId: r.hostId,
          createdAt: r.createdAt,
          isPublic: true,
          count: actualCount,
          maxMembers: r.maxMembers || 5,
        };
      })
    );

    // ✅ ลบห้องที่มี 0 คนทิ้งเลย + กรองเฉพาะห้องที่มีคน
    const activeRooms: any[] = [];
    const emptyRoomIds: string[] = [];

    for (const room of formattedRooms) {
      if (room.count === 0) {
        emptyRoomIds.push(room.roomId);
      } else {
        activeRooms.push(room);
      }
    }

    // 🗑️ ลบห้องว่างทั้งหมดในครั้งเดียว
    if (emptyRoomIds.length > 0) {
      console.log(`🗑️ Deleting ${emptyRoomIds.length} empty public rooms:`, emptyRoomIds);
      
      try {
        await dbClient.transaction(async (tx) => {
          for (const roomId of emptyRoomIds) {
            // ลบ queue
            await tx.delete(roomQueue).where(eq(roomQueue.roomId, roomId));
            // ลบ messages
            await tx.delete(roomMessages).where(eq(roomMessages.roomId, roomId));
            // ลบ members (ถ้ามี)
            await tx.delete(roomMembers).where(eq(roomMembers.roomId, roomId));
            // ลบห้อง
            await tx.delete(listeningRooms).where(eq(listeningRooms.id, roomId));
          }
        });

        // แจ้ง clients ทั้งหมดว่าห้องถูกลบ
        emptyRoomIds.forEach(roomId => {
          io.emit("room-deleted", { roomId });
        });

        console.log(`✅ Deleted ${emptyRoomIds.length} empty rooms successfully`);
      } catch (err) {
        console.error("❌ Error deleting empty rooms:", err);
      }
    }

    console.log(`📋 Listing ${activeRooms.length} active public rooms`);

    res.json(activeRooms);
  } catch (err) {
    next(err);
  }
};
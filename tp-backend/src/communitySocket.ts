import { Server } from "socket.io";
import { dbClient } from "@db/client.js";
import { roomQueue, songs, roomMessages, listeningRooms } from "@db/schema.js";
import { eq, asc, desc } from "drizzle-orm";
import { sanitizeSong, sanitizeQueueItem, playNextSong } from "../services/queueService.js";

export default function communitySocket(io: Server) {
  io.on("connection", (socket) => {
    // ทุก event ของ community
  });
}

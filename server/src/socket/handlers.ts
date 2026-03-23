import { Server, type Socket } from "socket.io";
import { ObjectId } from "mongodb";
import { createChatMessage } from "../models/Chat.js";
import { updateRoomCode, findRoomById } from "../models/Room.js";
import { findUserById } from "../models/User.js";

// Track connected users per room
const roomUsers = new Map<string, Map<string, { socketId: string; username: string; userId: string }>>();

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // ─── Join Room ────────────────────────────────────────────
    socket.on("join-room", async (data: { roomId: string; userId: string }) => {
      try {
        const { roomId, userId } = data;

        // Validate room exists
        const room = await findRoomById(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Validate user exists
        const user = await findUserById(userId);
        if (!user) {
          socket.emit("error", { message: "User not found" });
          return;
        }

        // Leave any previous room
        if (currentRoomId) {
          socket.leave(currentRoomId);
          removeUserFromTracking(currentRoomId, socket.id);
          io.to(currentRoomId).emit("user-left", {
            userId: currentUserId,
            users: getUsersInRoom(currentRoomId),
          });
        }

        // Join the new room
        currentRoomId = roomId;
        currentUserId = userId;
        socket.join(roomId);

        // Track the user
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId)!.set(socket.id, {
          socketId: socket.id,
          username: user.username || user.name,
          userId,
        });

        // Notify room of new user
        io.to(roomId).emit("user-joined", {
          userId,
          username: user.username || user.name,
          users: getUsersInRoom(roomId),
        });

        // Send current room state to the joining user
        socket.emit("room-state", {
          code: room.code,
          codeLanguage: room.codeLanguage,
          users: getUsersInRoom(roomId),
        });

        console.log(`👤 ${user.username || user.name} joined room ${room.roomCode}`);
      } catch (error) {
        console.error("Error joining room via socket:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ─── Code Change (real-time sync) ─────────────────────────
    socket.on("code-change", async (data: { code: string; codeLanguage?: string }) => {
      if (!currentRoomId) return;

      // Broadcast to others in the room (not sender)
      socket.to(currentRoomId).emit("code-update", {
        code: data.code,
        codeLanguage: data.codeLanguage,
        userId: currentUserId,
      });

      // Persist to database (debounced on client side recommended)
      try {
        await updateRoomCode(currentRoomId, data.code, data.codeLanguage);
      } catch (error) {
        console.error("Error saving code:", error);
      }
    });

    // ─── Cursor Position (for collaborative cursors)  ─────────
    socket.on("cursor-move", (data: { line: number; column: number }) => {
      if (!currentRoomId || !currentUserId) return;

      socket.to(currentRoomId).emit("cursor-update", {
        userId: currentUserId,
        line: data.line,
        column: data.column,
      });
    });

    // ─── Chat Message ─────────────────────────────────────────
    socket.on("send-message", async (data: { message: string }) => {
      if (!currentRoomId || !currentUserId) return;

      try {
        const chatMsg = await createChatMessage({
          roomId: new ObjectId(currentRoomId),
          senderId: new ObjectId(currentUserId),
          message: data.message,
        });

        // Broadcast to entire room (including sender)
        io.to(currentRoomId).emit("new-message", {
          _id: chatMsg._id,
          senderId: currentUserId,
          message: data.message,
          createdAt: chatMsg.createdAt,
        });
      } catch (error) {
        console.error("Error sending chat message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ─── Language Change ──────────────────────────────────────
    socket.on("language-change", (data: { codeLanguage: string }) => {
      if (!currentRoomId) return;

      socket.to(currentRoomId).emit("language-update", {
        codeLanguage: data.codeLanguage,
        userId: currentUserId,
      });
    });

    // ─── Leave Room ───────────────────────────────────────────
    socket.on("leave-room", () => {
      if (!currentRoomId) return;

      socket.leave(currentRoomId);
      removeUserFromTracking(currentRoomId, socket.id);

      io.to(currentRoomId).emit("user-left", {
        userId: currentUserId,
        users: getUsersInRoom(currentRoomId),
      });

      console.log(`👤 User ${currentUserId} left room ${currentRoomId}`);
      currentRoomId = null;
      currentUserId = null;
    });

    // ─── Disconnect ───────────────────────────────────────────
    socket.on("disconnect", () => {
      if (currentRoomId) {
        removeUserFromTracking(currentRoomId, socket.id);
        io.to(currentRoomId).emit("user-left", {
          userId: currentUserId,
          users: getUsersInRoom(currentRoomId),
        });
      }
      console.log(`⚡ Client disconnected: ${socket.id}`);
    });
  });
}

// ─── Helper functions ───────────────────────────────────────────

function removeUserFromTracking(roomId: string, socketId: string) {
  const users = roomUsers.get(roomId);
  if (users) {
    users.delete(socketId);
    if (users.size === 0) {
      roomUsers.delete(roomId);
    }
  }
}

function getUsersInRoom(roomId: string): Array<{ socketId: string; username: string; userId: string }> {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.values());
}

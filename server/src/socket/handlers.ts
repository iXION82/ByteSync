import { Server, type Socket } from "socket.io";
import { ObjectId } from "mongodb";
import { createChatMessage } from "../models/Chat.js";
import { updateRoomCode, findRoomById } from "../models/Room.js";
import { findUserById, setActiveRoom, clearActiveRoom } from "../models/User.js";

// Track connected users per room
const roomUsers = new Map<string, Map<string, { socketId: string; username: string; userId: string }>>();

// Track latest code per room (in-memory buffer for interval saves)
const roomCodeBuffer = new Map<string, { code: string; codeLanguage?: string; dirty: boolean }>();

// Save interval timers per room
const saveTimers = new Map<string, NodeJS.Timeout>();

const SAVE_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Save the buffered code to the database
 */
async function flushCodeToDb(roomId: string) {
  const buffer = roomCodeBuffer.get(roomId);
  if (!buffer || !buffer.dirty) return;

  try {
    await updateRoomCode(roomId, buffer.code, buffer.codeLanguage);
    buffer.dirty = false;
    console.log(`💾 Auto-saved code for room ${roomId}`);
  } catch (error) {
    console.error(`Error auto-saving code for room ${roomId}:`, error);
  }
}

/**
 * Start the 3-minute auto-save interval for a room
 */
function startSaveTimer(roomId: string) {
  if (saveTimers.has(roomId)) return; // already running

  const timer = setInterval(() => {
    flushCodeToDb(roomId);
  }, SAVE_INTERVAL_MS);

  saveTimers.set(roomId, timer);
}

/**
 * Stop the auto-save timer for a room (when all users leave)
 */
function stopSaveTimer(roomId: string) {
  const timer = saveTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    saveTimers.delete(roomId);
  }
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // ─── Join Room ────────────────────────────────────────────
    socket.on("join-room", async (data: { roomId: string; userId?: string; clerkId?: string }) => {
      try {
        const { roomId, userId: rawUserId, clerkId } = data;

        // Validate room exists
        const room = await findRoomById(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Find user by either userId or clerkId
        let user;
        if (rawUserId) {
          user = await findUserById(rawUserId);
        }
        if (!user && clerkId) {
          const { findUserByClerkId } = await import("../models/User.js");
          user = await findUserByClerkId(clerkId);
        }
        if (!user) {
          socket.emit("error", { message: "User not found" });
          return;
        }

        // Leave any previous room
        if (currentRoomId) {
          await handleLeaveRoom(socket, io, currentRoomId, currentUserId);
        }

        // Join the new room
        currentRoomId = roomId;
        currentUserId = user._id.toString();
        socket.join(roomId);

        // Track the user
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId)!.set(socket.id, {
          socketId: socket.id,
          username: user.username || user.name,
          userId: user._id.toString(),
        });

        // Initialize code buffer from DB if not present
        if (!roomCodeBuffer.has(roomId)) {
          roomCodeBuffer.set(roomId, {
            code: room.code || "",
            codeLanguage: room.codeLanguage,
            dirty: false,
          });
        }

        // Start auto-save timer for this room
        startSaveTimer(roomId);

        // Set active room in DB
        try {
          await setActiveRoom(user._id.toString(), new ObjectId(roomId));
        } catch (err) {
          console.error("Error setting active room:", err);
        }

        // Notify room of new user
        io.to(roomId).emit("user-joined", {
          userId: user._id.toString(),
          username: user.username || user.name,
          users: getUsersInRoom(roomId),
        });

        // Send current room state to the joining user
        const buffer = roomCodeBuffer.get(roomId);
        socket.emit("room-state", {
          code: buffer?.code || room.code,
          codeLanguage: buffer?.codeLanguage || room.codeLanguage,
          users: getUsersInRoom(roomId),
        });

        console.log(`👤 ${user.username || user.name} joined room ${room.roomCode}`);
      } catch (error) {
        console.error("Error joining room via socket:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ─── Code Change (real-time sync — broadcast only, no DB save) ──
    socket.on("code-change", (data: { code: string; codeLanguage?: string }) => {
      if (!currentRoomId) return;

      // Broadcast to others in the room (not sender)
      socket.to(currentRoomId).emit("code-update", {
        code: data.code,
        codeLanguage: data.codeLanguage,
        userId: currentUserId,
      });

      // Buffer the code in memory (saved to DB every 3 min or on leave)
      const buffer = roomCodeBuffer.get(currentRoomId);
      if (buffer) {
        buffer.code = data.code;
        if (data.codeLanguage) buffer.codeLanguage = data.codeLanguage;
        buffer.dirty = true;
      } else {
        roomCodeBuffer.set(currentRoomId, {
          code: data.code,
          codeLanguage: data.codeLanguage,
          dirty: true,
        });
      }
    });

    // ─── Language Change ──────────────────────────────────────
    socket.on("language-change", (data: { codeLanguage: string; code: string }) => {
      if (!currentRoomId) return;

      socket.to(currentRoomId).emit("language-update", {
        codeLanguage: data.codeLanguage,
        code: data.code,
        userId: currentUserId,
      });

      // Also buffer the language change
      const buffer = roomCodeBuffer.get(currentRoomId);
      if (buffer) {
        buffer.codeLanguage = data.codeLanguage;
        buffer.code = data.code;
        buffer.dirty = true;
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

    // ─── Manual Save (client can request explicit save) ───────
    socket.on("save-code", async () => {
      if (!currentRoomId) return;
      await flushCodeToDb(currentRoomId);
      socket.emit("code-saved", { timestamp: new Date().toISOString() });
    });

    // ─── Leave Room ───────────────────────────────────────────
    socket.on("leave-room", async () => {
      if (!currentRoomId) return;
      await handleLeaveRoom(socket, io, currentRoomId, currentUserId);
      currentRoomId = null;
      currentUserId = null;
    });

    // ─── Disconnect ───────────────────────────────────────────
    socket.on("disconnect", async () => {
      if (currentRoomId) {
        await handleLeaveRoom(socket, io, currentRoomId, currentUserId);
      }
      console.log(`⚡ Client disconnected: ${socket.id}`);
    });
  });
}

// ─── Shared leave logic ─────────────────────────────────────────
async function handleLeaveRoom(
  socket: Socket,
  io: Server,
  roomId: string,
  userId: string | null
) {
  // Flush code to DB before leaving
  await flushCodeToDb(roomId);

  socket.leave(roomId);
  removeUserFromTracking(roomId, socket.id);

  io.to(roomId).emit("user-left", {
    userId,
    users: getUsersInRoom(roomId),
  });

  // If room is now empty, stop the save timer and clean up buffer
  const users = roomUsers.get(roomId);
  if (!users || users.size === 0) {
    stopSaveTimer(roomId);
    roomCodeBuffer.delete(roomId);
  }

  // Clear active room in DB
  if (userId) {
    try {
      await clearActiveRoom(userId);
    } catch (err) {
      console.error("Error clearing active room:", err);
    }
  }

  console.log(`👤 User ${userId} left room ${roomId}`);
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

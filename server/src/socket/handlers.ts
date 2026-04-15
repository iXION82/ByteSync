import { Server, type Socket } from "socket.io";
import { ObjectId } from "mongodb";
import { createChatMessage } from "../models/Chat.js";
import {
  updateRoomCode,
  findRoomById,
  addFileToRoom,
  removeFileFromRoom,
  renameFileInRoom,
  setActiveFile,
  updateFileContent,
  type RoomFile,
} from "../models/Room.js";
import { findUserById, setActiveRoom, clearActiveRoom } from "../models/User.js";
import {
  createSnapshot,
  createEditEventsBatch,
  getLatestSnapshot,
  type EditEvent,
  type SnapshotFile,
} from "../models/SessionReplay.js";

// Track connected users per room
const roomUsers = new Map<string, Map<string, { socketId: string; username: string; userId: string }>>();

// Track latest code per room — now file-aware
// files: Map<filename, content>, activeFile: current filename
interface RoomBuffer {
  files: Map<string, { content: string; language: string }>;
  activeFile: string;
  codeLanguage: string;
  dirty: boolean;
}
const roomCodeBuffer = new Map<string, RoomBuffer>();

// ─── Session Replay Tracking ────────────────────────────────────
// Buffer edit events per room (flushed alongside snapshots)
const editEventBuffer = new Map<string, EditEvent[]>();
// Track the current snapshot sequence per room for edit event references
const currentSnapshotSeq = new Map<string, number>();

// Save interval timers per room
const saveTimers = new Map<string, NodeJS.Timeout>();

const SAVE_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Save the buffered code to the database (saves all dirty files)
 */
async function flushCodeToDb(roomId: string, trigger: "auto" | "manual" | "join" | "leave" | "file-change" | "language-change" = "auto", userId?: string, username?: string) {
  const buffer = roomCodeBuffer.get(roomId);
  if (!buffer || !buffer.dirty) return;

  try {
    // Save each file's content to the DB
    for (const [filename, fileData] of buffer.files.entries()) {
      await updateFileContent(roomId, filename, fileData.content);
    }

    // Also sync the top-level code/codeLanguage for backward compat
    const activeFileData = buffer.files.get(buffer.activeFile);
    if (activeFileData) {
      await updateRoomCode(roomId, activeFileData.content, buffer.codeLanguage);
    }

    buffer.dirty = false;

    // ─── Session Replay: Create snapshot ─────────────────────
    try {
      const snapshotFiles: SnapshotFile[] = Array.from(buffer.files.entries()).map(([fn, data]) => ({
        filename: fn,
        content: data.content,
        language: data.language,
      }));

      const snapshot = await createSnapshot({
        roomId: new ObjectId(roomId),
        timestamp: new Date(),
        files: snapshotFiles,
        activeFile: buffer.activeFile,
        codeLanguage: buffer.codeLanguage,
        userId: userId ? new ObjectId(userId) : undefined,
        username,
        trigger,
      });

      // Update the current snapshot seq for this room
      currentSnapshotSeq.set(roomId, snapshot.seq);

      // Flush buffered edit events
      const pendingEdits = editEventBuffer.get(roomId);
      if (pendingEdits && pendingEdits.length > 0) {
        await createEditEventsBatch(pendingEdits);
        editEventBuffer.set(roomId, []);
      }
    } catch (replayErr) {
      console.error(`Error recording replay snapshot for room ${roomId}:`, replayErr);
    }

    console.log(`💾 Auto-saved code for room ${roomId} (trigger: ${trigger})`);
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

/**
 * Get the serializable files array from the buffer
 */
function getBufferedFiles(roomId: string): RoomFile[] {
  const buffer = roomCodeBuffer.get(roomId);
  if (!buffer) return [];
  return Array.from(buffer.files.entries()).map(([filename, data]) => ({
    filename,
    content: data.content,
    language: data.language,
  }));
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

        // Initialize file-aware buffer from DB if not present
        if (!roomCodeBuffer.has(roomId)) {
          const filesMap = new Map<string, { content: string; language: string }>();

          // Populate from DB files array (or fall back to single code field)
          if (room.files && room.files.length > 0) {
            for (const f of room.files) {
              filesMap.set(f.filename, { content: f.content, language: f.language });
            }
          } else {
            // Backward compat: room has no files array yet
            const defaultFilename = `main.${getExtension(room.codeLanguage)}`;
            filesMap.set(defaultFilename, { content: room.code || "", language: room.codeLanguage });
          }

          roomCodeBuffer.set(roomId, {
            files: filesMap,
            activeFile: room.activeFile || filesMap.keys().next().value || "main.js",
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

        // Send current room state to the joining user (now includes files)
        const buffer = roomCodeBuffer.get(roomId)!;
        const activeFileData = buffer.files.get(buffer.activeFile);
        socket.emit("room-state", {
          code: activeFileData?.content || room.code,
          codeLanguage: activeFileData?.language || room.codeLanguage,
          users: getUsersInRoom(roomId),
          files: getBufferedFiles(roomId),
          activeFile: buffer.activeFile,
        });

        console.log(`👤 ${user.username || user.name} joined room ${room.roomCode}`);

        // ─── Session Replay: Record join snapshot ────────────
        try {
          // Initialize replay tracking for this room
          if (!editEventBuffer.has(roomId)) editEventBuffer.set(roomId, []);
          const latestSnap = await getLatestSnapshot(roomId);
          currentSnapshotSeq.set(roomId, latestSnap?.seq ?? -1);

          // Mark buffer dirty temporarily to force a snapshot
          const buf = roomCodeBuffer.get(roomId);
          if (buf) {
            buf.dirty = true;
            await flushCodeToDb(roomId, "join", user._id.toString(), user.username || user.name);
          }
        } catch (replayErr) {
          console.error("Error recording join snapshot:", replayErr);
        }
      } catch (error) {
        console.error("Error joining room via socket:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ─── Code Change (real-time sync — broadcast only, no DB save) ──
    socket.on("code-change", (data: { code: string; codeLanguage?: string; filename?: string }) => {
      if (!currentRoomId) return;

      // Broadcast to others in the room (not sender)
      socket.to(currentRoomId).emit("code-update", {
        code: data.code,
        codeLanguage: data.codeLanguage,
        userId: currentUserId,
        filename: data.filename,
      });

      // Buffer the code in memory (saved to DB every 3 min or on leave)
      const buffer = roomCodeBuffer.get(currentRoomId);
      if (buffer) {
        const targetFile = data.filename || buffer.activeFile;
        const existing = buffer.files.get(targetFile);
        if (existing) {
          existing.content = data.code;
          if (data.codeLanguage) existing.language = data.codeLanguage;
        }
        if (data.codeLanguage) buffer.codeLanguage = data.codeLanguage;
        buffer.dirty = true;
      }

      // ─── Session Replay: Buffer edit event ─────────────────
      const edits = editEventBuffer.get(currentRoomId);
      if (edits) {
        edits.push({
          roomId: new ObjectId(currentRoomId),
          timestamp: new Date(),
          filename: data.filename || buffer?.activeFile || "unknown",
          content: data.code,
          afterSnapshotSeq: currentSnapshotSeq.get(currentRoomId) ?? 0,
          userId: currentUserId ? new ObjectId(currentUserId) : undefined,
        });
      }
    });

    // ─── Language Change ──────────────────────────────────────
    socket.on("language-change", async (data: { codeLanguage: string; code: string }) => {
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
        const activeFileData = buffer.files.get(buffer.activeFile);
        if (activeFileData) {
          activeFileData.content = data.code;
          activeFileData.language = data.codeLanguage;
        }
        buffer.dirty = true;

        // ─── Session Replay: Snapshot on language change ─────
        await flushCodeToDb(currentRoomId, "language-change", currentUserId || undefined);
      }
    });

    // ─── Create File ──────────────────────────────────────────
    socket.on("create-file", async (data: { filename: string; language: string; content?: string }) => {
      if (!currentRoomId) return;

      try {
        // Auto-save current code before creating a new file
        await flushCodeToDb(currentRoomId);

        const newFile: RoomFile = {
          filename: data.filename,
          content: data.content || "",
          language: data.language,
        };

        // Persist to DB
        const updatedRoom = await addFileToRoom(currentRoomId, newFile);
        if (!updatedRoom) {
          socket.emit("error", { message: "Failed to create file (max 10 or duplicate name)" });
          return;
        }

        // Update in-memory buffer
        const buffer = roomCodeBuffer.get(currentRoomId);
        if (buffer) {
          buffer.files.set(data.filename, { content: newFile.content, language: newFile.language });
        }

        // Broadcast to entire room
        io.to(currentRoomId).emit("file-created", {
          filename: data.filename,
          language: data.language,
          content: newFile.content,
          files: getBufferedFiles(currentRoomId),
          userId: currentUserId,
        });

        console.log(`📄 File created: ${data.filename} in room ${currentRoomId}`);

        // ─── Session Replay: Snapshot on file creation ───────
        const buf = roomCodeBuffer.get(currentRoomId);
        if (buf) {
          buf.dirty = true;
          await flushCodeToDb(currentRoomId, "file-change", currentUserId || undefined);
        }
      } catch (error) {
        console.error("Error creating file:", error);
        socket.emit("error", { message: "Failed to create file" });
      }
    });

    // ─── Delete File ──────────────────────────────────────────
    socket.on("delete-file", async (data: { filename: string }) => {
      if (!currentRoomId) return;

      try {
        // Auto-save before deleting
        await flushCodeToDb(currentRoomId);

        const updatedRoom = await removeFileFromRoom(currentRoomId, data.filename);
        if (!updatedRoom) {
          socket.emit("error", { message: "Cannot delete file (must keep at least 1)" });
          return;
        }

        // Update in-memory buffer
        const buffer = roomCodeBuffer.get(currentRoomId);
        if (buffer) {
          buffer.files.delete(data.filename);

          // If deleted file was active, switch to first available file
          if (buffer.activeFile === data.filename) {
            const firstFile = buffer.files.keys().next().value;
            if (firstFile) {
              buffer.activeFile = firstFile;
              const fileData = buffer.files.get(firstFile)!;
              buffer.codeLanguage = fileData.language;
              await setActiveFile(currentRoomId, firstFile);
            }
          }
        }

        // Broadcast to entire room
        io.to(currentRoomId).emit("file-deleted", {
          filename: data.filename,
          files: getBufferedFiles(currentRoomId),
          activeFile: buffer?.activeFile || "",
          userId: currentUserId,
        });

        console.log(`🗑️ File deleted: ${data.filename} in room ${currentRoomId}`);

        // ─── Session Replay: Snapshot on file deletion ───────
        const buf = roomCodeBuffer.get(currentRoomId);
        if (buf) {
          buf.dirty = true;
          await flushCodeToDb(currentRoomId, "file-change", currentUserId || undefined);
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        socket.emit("error", { message: "Failed to delete file" });
      }
    });

    // ─── Rename File ──────────────────────────────────────────
    socket.on("rename-file", async (data: { oldFilename: string; newFilename: string }) => {
      if (!currentRoomId) return;

      try {
        await flushCodeToDb(currentRoomId);

        const updatedRoom = await renameFileInRoom(currentRoomId, data.oldFilename, data.newFilename);
        if (!updatedRoom) {
          socket.emit("error", { message: "Failed to rename file" });
          return;
        }

        // Update in-memory buffer
        const buffer = roomCodeBuffer.get(currentRoomId);
        if (buffer) {
          const fileData = buffer.files.get(data.oldFilename);
          if (fileData) {
            buffer.files.delete(data.oldFilename);
            buffer.files.set(data.newFilename, fileData);
          }
          if (buffer.activeFile === data.oldFilename) {
            buffer.activeFile = data.newFilename;
          }
        }

        // Broadcast to entire room
        io.to(currentRoomId).emit("file-renamed", {
          oldFilename: data.oldFilename,
          newFilename: data.newFilename,
          files: getBufferedFiles(currentRoomId),
          activeFile: buffer?.activeFile || "",
          userId: currentUserId,
        });

        console.log(`✏️ File renamed: ${data.oldFilename} → ${data.newFilename} in room ${currentRoomId}`);

        // ─── Session Replay: Snapshot on file rename ─────────
        const buf = roomCodeBuffer.get(currentRoomId);
        if (buf) {
          buf.dirty = true;
          await flushCodeToDb(currentRoomId, "file-change", currentUserId || undefined);
        }
      } catch (error) {
        console.error("Error renaming file:", error);
        socket.emit("error", { message: "Failed to rename file" });
      }
    });

    // ─── Switch File ──────────────────────────────────────────
    socket.on("switch-file", async (data: { filename: string }) => {
      if (!currentRoomId) return;

      try {
        // Auto-save current file before switching
        await flushCodeToDb(currentRoomId);

        // Update active file in DB
        await setActiveFile(currentRoomId, data.filename);

        // Update in-memory buffer
        const buffer = roomCodeBuffer.get(currentRoomId);
        if (buffer) {
          buffer.activeFile = data.filename;
          const fileData = buffer.files.get(data.filename);
          if (fileData) {
            buffer.codeLanguage = fileData.language;
          }
        }

        // Broadcast to entire room
        const fileData = buffer?.files.get(data.filename);
        io.to(currentRoomId).emit("file-switched", {
          filename: data.filename,
          content: fileData?.content || "",
          language: fileData?.language || "",
          userId: currentUserId,
        });

        console.log(`📂 Switched to file: ${data.filename} in room ${currentRoomId}`);
      } catch (error) {
        console.error("Error switching file:", error);
        socket.emit("error", { message: "Failed to switch file" });
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
      await flushCodeToDb(currentRoomId, "manual", currentUserId || undefined);
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
  // Flush code to DB before leaving (with leave snapshot)
  const buffer = roomCodeBuffer.get(roomId);
  if (buffer) {
    buffer.dirty = true; // force snapshot even if no edits
  }
  await flushCodeToDb(roomId, "leave", userId || undefined);

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

const EXT_MAP: Record<string, string> = {
  javascript: "js", typescript: "ts", python: "py", java: "java",
  "c++": "cpp", c: "c", go: "go", rust: "rs",
};

function getExtension(lang: string): string {
  return EXT_MAP[lang] || "txt";
}

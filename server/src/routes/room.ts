import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import {
  createRoom,
  findRoomByCode,
  findRoomById,
  findRoomsByOwner,
  addUserToRoom,
  removeUserFromRoom,
  deactivateRoom,
} from "../models/Room.js";
import {
  findUserByClerkId,
  findUserById,
  addJoinedRoom,
  removeJoinedRoom,
  addCreatedRoom,
  removeCreatedRoom,
} from "../models/User.js";

const router = Router();
const SALT_ROUNDS = 10;

// ─── Create a new room ─────────────────────────────────────────
router.post("/create", async (req: Request, res: Response): Promise<void> => {
  try {
    const { clerkId, password, codeLanguage, code } = req.body;

    if (!clerkId || !password) {
      res.status(400).json({ error: "clerkId and password are required" });
      return;
    }

    // Find the user
    const user = await findUserByClerkId(clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check created room limit
    if (user.createdRoomIds && user.createdRoomIds.length >= 3) {
      res.status(403).json({ error: "Maximum 3 created rooms allowed" });
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the room
    const room = await createRoom({
      ownerId: user._id,
      passwordHash,
      codeLanguage: codeLanguage || "javascript",
      code: code || "",
    });

    // Add room to user's created rooms
    await addCreatedRoom(user._id.toString(), room._id);

    res.status(201).json({
      roomId: room._id,
      roomCode: room.roomCode,
      message: "Room created successfully",
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Join a room ────────────────────────────────────────────────
router.post("/join", async (req: Request, res: Response): Promise<void> => {
  try {
    const { clerkId, roomCode, password } = req.body;

    if (!clerkId || !roomCode || !password) {
      res.status(400).json({ error: "clerkId, roomCode, and password are required" });
      return;
    }

    // Find the user
    const user = await findUserByClerkId(clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check joined room limit
    if (user.joinedRoomIds && user.joinedRoomIds.length >= 3) {
      res.status(403).json({ error: "Maximum 3 joined rooms allowed" });
      return;
    }

    // Find the room
    const room = await findRoomByCode(roomCode);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // If user is the owner, let them rejoin
    if (room.ownerId.equals(user._id)) {
      res.json({
        roomId: room._id,
        roomCode: room.roomCode,
        codeLanguage: room.codeLanguage,
        message: "Rejoining your own room",
      });
      return;
    }

    // If user is already in the room, let them rejoin
    const alreadyIn = room.allowedUsers.some((u) => u.userId.equals(user._id));
    if (alreadyIn) {
      res.json({
        roomId: room._id,
        roomCode: room.roomCode,
        codeLanguage: room.codeLanguage,
        message: "Rejoining room",
      });
      return;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, room.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid room password" });
      return;
    }

    // Check room capacity (max 5 allowed users)
    if (room.allowedUsers.length >= 5) {
      res.status(403).json({ error: "Room is full (max 5 participants)" });
      return;
    }

    // Add user to room
    await addUserToRoom(room._id.toString(), user._id, "editor");

    // Add room to user's joined rooms
    await addJoinedRoom(user._id.toString(), room._id);

    res.json({
      roomId: room._id,
      roomCode: room.roomCode,
      codeLanguage: room.codeLanguage,
      message: "Joined room successfully",
    });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Leave a room ───────────────────────────────────────────────
router.post("/leave", async (req: Request, res: Response): Promise<void> => {
  try {
    const { clerkId, roomId } = req.body;

    if (!clerkId || !roomId) {
      res.status(400).json({ error: "clerkId and roomId are required" });
      return;
    }

    const user = await findUserByClerkId(clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const roomObjId = new ObjectId(roomId);

    // Remove user from room's allowed list
    await removeUserFromRoom(roomId, user._id);

    // Remove room from user's joined rooms
    await removeJoinedRoom(user._id.toString(), roomObjId);

    res.json({ message: "Left room successfully" });
  } catch (error) {
    console.error("Error leaving room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get room details by ID (with resolved participant names) ───
router.get("/details/:roomId", async (req: Request<{ roomId: string }>, res: Response): Promise<void> => {
  try {
    const room = await findRoomById(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Resolve owner info
    const owner = await findUserById(room.ownerId.toString());

    // Resolve allowed users info
    const participants = await Promise.all(
      (room.allowedUsers || []).map(async (au) => {
        const user = await findUserById(au.userId.toString());
        return {
          userId: au.userId.toString(),
          clerkId: user?.clerkId,
          role: au.role,
          name: user?.name || user?.username || "Unknown",
          username: user?.username || "unknown",
        };
      })
    );

    const { passwordHash, ...safeRoom } = room;

    res.json({
      ...safeRoom,
      owner: owner
        ? { userId: owner._id.toString(), clerkId: owner.clerkId, name: owner.name, username: owner.username }
        : null,
      participants,
    });
  } catch (error) {
    console.error("Error fetching room details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get room info ──────────────────────────────────────────────
router.get("/:roomCode", async (req: Request<{ roomCode: string }>, res: Response): Promise<void> => {
  try {
    const roomCode = req.params.roomCode;

    const room = await findRoomByCode(roomCode);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Don't expose passwordHash
    const { passwordHash, ...safeRoom } = room;

    res.json(safeRoom);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get rooms owned by user ────────────────────────────────────
router.get("/user/:clerkId", async (req: Request<{ clerkId: string }>, res: Response): Promise<void> => {
  try {
    const user = await findUserByClerkId(req.params.clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const rooms = await findRoomsByOwner(user._id.toString());

    // Don't expose password hashes
    const safeRooms = rooms.map(({ passwordHash, ...rest }) => rest);

    res.json(safeRooms);
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Delete (deactivate) a room ─────────────────────────────────
router.delete("/:roomId", async (req: Request<{ roomId: string }>, res: Response): Promise<void> => {
  try {
    const { clerkId } = req.body;
    const roomId = req.params.roomId;

    if (!clerkId) {
      res.status(400).json({ error: "clerkId is required" });
      return;
    }

    const user = await findUserByClerkId(clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const room = await findRoomById(roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Only owner can delete
    if (!room.ownerId.equals(user._id)) {
      res.status(403).json({ error: "Only the room owner can delete a room" });
      return;
    }

    await deactivateRoom(roomId);
    await removeCreatedRoom(user._id.toString(), room._id);

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Session Replay Endpoints ──────────────────────────────────

import {
  getSnapshotsByRoom,
  getSnapshotCount,
  getEditEventsBetweenSnapshots,
  getSnapshotBySeq,
} from "../models/SessionReplay.js";

/**
 * GET /api/rooms/:roomId/replay/snapshots
 * Returns the snapshot timeline for a room.
 * Query: ?limit=500
 */
router.get("/:roomId/replay/snapshots", async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 2000);

    const snapshots = await getSnapshotsByRoom(roomId, limit);
    const count = await getSnapshotCount(roomId);

    res.json({ snapshots, total: count });
  } catch (error) {
    console.error("Error fetching replay snapshots:", error);
    res.status(500).json({ error: "Failed to fetch replay data" });
  }
});

/**
 * GET /api/rooms/:roomId/replay/snapshot/:seq
 * Returns a specific snapshot and all edit events that follow it.
 */
router.get("/:roomId/replay/snapshot/:seq", async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const seq = req.params.seq as string;
    const seqNum = parseInt(seq);

    const snapshot = await getSnapshotBySeq(roomId, seqNum);
    if (!snapshot) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }

    const editEvents = await getEditEventsBetweenSnapshots(roomId, seqNum);

    res.json({ snapshot, editEvents });
  } catch (error) {
    console.error("Error fetching snapshot detail:", error);
    res.status(500).json({ error: "Failed to fetch snapshot" });
  }
});

/**
 * GET /api/rooms/:roomId/replay/events?afterSeq=0&limit=5000
 * Returns edit events after a specific snapshot sequence.
 */
router.get("/:roomId/replay/events", async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const afterSeq = parseInt(req.query.afterSeq as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 5000, 10000);

    const events = await getEditEventsBetweenSnapshots(roomId, afterSeq, limit);

    res.json({ events, count: events.length });
  } catch (error) {
    console.error("Error fetching edit events:", error);
    res.status(500).json({ error: "Failed to fetch edit events" });
  }
});

export default router;

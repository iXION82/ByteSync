import { Router, type Request, type Response } from "express";
import { ObjectId } from "mongodb";
import { findUserByClerkId, setActiveRoom, clearActiveRoom } from "../models/User.js";
import { findRoomById, removeUserFromRoom } from "../models/Room.js";

const router = Router();

// ─── Get user's rooms (created + joined) with details ───────────
router.get("/:clerkId/rooms", async (req: Request<{ clerkId: string }>, res: Response): Promise<void> => {
  try {
    const user = await findUserByClerkId(req.params.clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Fetch details for created rooms
    const createdRooms = await Promise.all(
      (user.createdRoomIds || []).map(async (id) => {
        const room = await findRoomById(id.toString());
        if (!room) return null;
        const { passwordHash, ...safeRoom } = room;
        return { ...safeRoom, relationship: "owner" as const };
      })
    );

    // Fetch details for joined rooms
    const joinedRooms = await Promise.all(
      (user.joinedRoomIds || []).map(async (id) => {
        const room = await findRoomById(id.toString());
        if (!room) return null;
        const { passwordHash, ...safeRoom } = room;
        return { ...safeRoom, relationship: "member" as const };
      })
    );

    res.json({
      createdRooms: createdRooms.filter(Boolean),
      joinedRooms: joinedRooms.filter(Boolean),
      activeRoomId: user.activeRoomId?.toString() || null,
    });
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Set active room (auto-leave previous) ──────────────────────
router.post("/set-active", async (req: Request, res: Response): Promise<void> => {
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

    // If user already has an active room that differs, leave it
    if (user.activeRoomId && user.activeRoomId.toString() !== roomId) {
      // Remove user from old room's allowed list (only if member, not owner)
      const oldRoom = await findRoomById(user.activeRoomId.toString());
      if (oldRoom && !oldRoom.ownerId.equals(user._id)) {
        await removeUserFromRoom(user.activeRoomId.toString(), user._id);
      }
    }

    // Set new active room
    await setActiveRoom(user._id.toString(), new ObjectId(roomId));

    res.json({ message: "Active room updated", activeRoomId: roomId });
  } catch (error) {
    console.error("Error setting active room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Clear active room ──────────────────────────────────────────
router.post("/clear-active", async (req: Request, res: Response): Promise<void> => {
  try {
    const { clerkId } = req.body;

    if (!clerkId) {
      res.status(400).json({ error: "clerkId is required" });
      return;
    }

    const user = await findUserByClerkId(clerkId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await clearActiveRoom(user._id.toString());

    res.json({ message: "Active room cleared" });
  } catch (error) {
    console.error("Error clearing active room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router, type Request, type Response } from "express";
import { getMessagesByRoom } from "../models/Chat.js";

const router = Router();

router.get("/:roomId", async (req: Request<{ roomId: string }>, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before
      ? new Date(req.query.before as string)
      : undefined;

    const messages = await getMessagesByRoom(roomId, limit, before);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

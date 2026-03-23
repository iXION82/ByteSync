import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

// ─── Chat Document Interface ────────────────────────────────────
export interface ChatDocument {
  roomId: ObjectId;      // ref → rooms (scopes messages per room)
  senderId: ObjectId;    // ref → users
  message: string;
  createdAt: Date;       // indexed for time-ordered queries
}

// ─── Collection Helper ──────────────────────────────────────────
let indexesEnsured = false;

async function getChatsCollection() {
  const db = await getDatabase();
  const collection = db.collection<ChatDocument>("chats");

  if (!indexesEnsured) {
    // Compound index for efficient per-room time-ordered queries
    await collection.createIndex({ roomId: 1, createdAt: 1 });
    await collection.createIndex({ senderId: 1 });
    indexesEnsured = true;
  }

  return collection;
}

// ─── CRUD Functions ────────────────────────────────────────────

/**
 * Create a new chat message
 */
export async function createChatMessage(
  data: Omit<ChatDocument, "createdAt">
): Promise<WithId<ChatDocument>> {
  const collection = await getChatsCollection();
  const now = new Date();

  const doc: ChatDocument = {
    ...data,
    createdAt: now,
  };

  const result = await collection.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

/**
 * Get messages for a room, sorted by creation time (newest last).
 * Supports pagination via limit and optional `before` cursor.
 */
export async function getMessagesByRoom(
  roomId: string,
  limit: number = 50,
  before?: Date
): Promise<WithId<ChatDocument>[]> {
  const collection = await getChatsCollection();

  const filter: Record<string, unknown> = {
    roomId: new ObjectId(roomId),
  };

  // Cursor-based pagination: get messages before a certain time
  if (before) {
    filter.createdAt = { $lt: before };
  }

  return collection
    .find(filter)
    .sort({ createdAt: -1 }) // newest first for pagination
    .limit(limit)
    .toArray()
    .then((msgs) => msgs.reverse()); // reverse so oldest is first in the batch
}

/**
 * Get the latest N messages for a room (for initial load)
 */
export async function getLatestMessages(
  roomId: string,
  limit: number = 30
): Promise<WithId<ChatDocument>[]> {
  return getMessagesByRoom(roomId, limit);
}

/**
 * Delete all messages in a room (used when deleting a room)
 */
export async function deleteMessagesByRoom(
  roomId: string
): Promise<number> {
  const collection = await getChatsCollection();
  const result = await collection.deleteMany({
    roomId: new ObjectId(roomId),
  });
  return result.deletedCount;
}

/**
 * Get message count for a room
 */
export async function getMessageCount(roomId: string): Promise<number> {
  const collection = await getChatsCollection();
  return collection.countDocuments({ roomId: new ObjectId(roomId) });
}

import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "../db.js";

export interface ChatDocument {
  roomId: ObjectId;
  senderId: ObjectId;
  message: string;
  createdAt: Date;
}

let indexesEnsured = false;

async function getChatsCollection() {
  const db = await getDatabase();
  const collection = db.collection<ChatDocument>("chats");

  if (!indexesEnsured) {
    await collection.createIndex({ roomId: 1, createdAt: 1 });
    await collection.createIndex({ senderId: 1 });
    indexesEnsured = true;
  }

  return collection;
}

export async function createChatMessage(
  data: Omit<ChatDocument, "createdAt">
): Promise<WithId<ChatDocument>> {
  const collection = await getChatsCollection();
  const now = new Date();

  const doc: ChatDocument = { ...data, createdAt: now };
  const result = await collection.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function getMessagesByRoom(
  roomId: string,
  limit: number = 50,
  before?: Date
): Promise<WithId<ChatDocument>[]> {
  const collection = await getChatsCollection();

  const filter: Record<string, unknown> = {
    roomId: new ObjectId(roomId),
  };
  if (before) {
    filter.createdAt = { $lt: before };
  }

  return collection
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
    .then((msgs) => msgs.reverse());
}

export async function deleteMessagesByRoom(roomId: string): Promise<number> {
  const collection = await getChatsCollection();
  const result = await collection.deleteMany({
    roomId: new ObjectId(roomId),
  });
  return result.deletedCount;
}

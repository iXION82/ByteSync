import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "../db.js";

// ─── User Document Interface (read-only on server side) ─────────
export interface UserDocument {
  clerkId: string;
  username: string;
  email: string;
  name: string;
  imageUrl?: string;
  joinedRoomIds: ObjectId[];
  createdRoomIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Collection Helper ──────────────────────────────────────────
async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection<UserDocument>("users");
}

// ─── Read-only Helpers ──────────────────────────────────────────

export async function findUserById(
  id: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function findUserByClerkId(
  clerkId: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ clerkId });
}

export async function findUserByUsername(
  username: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ username });
}

/**
 * Add a joined room ID to a user (max 3)
 */
export async function addJoinedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(userId),
      $expr: { $lt: [{ $size: "$joinedRoomIds" }, 3] },
    },
    {
      $addToSet: { joinedRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Remove a joined room ID from a user
 */
export async function removeJoinedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $pull: { joinedRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Add a created room ID to a user (max 3)
 */
export async function addCreatedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(userId),
      $expr: { $lt: [{ $size: "$createdRoomIds" }, 3] },
    },
    {
      $addToSet: { createdRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Remove a created room ID from a user
 */
export async function removeCreatedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $pull: { createdRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

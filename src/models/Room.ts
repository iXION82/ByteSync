import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import crypto from "crypto";

// ─── Room Document Interface ────────────────────────────────────
export interface AllowedUser {
  userId: ObjectId;
  role: "editor" | "viewer";
}

export interface RoomDocument {
  ownerId: ObjectId;
  roomCode: string;            // unique, 8 alphanumeric chars
  passwordHash: string;        // hashed room password
  codeLanguage: string;        // language ID matching editorConstants
  code: string;                // current editor content
  allowedUsers: AllowedUser[]; // max 5 (besides owner)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Collection Helper ──────────────────────────────────────────
let indexesEnsured = false;

async function getRoomsCollection() {
  const db = await getDatabase();
  const collection = db.collection<RoomDocument>("rooms");

  if (!indexesEnsured) {
    await collection.createIndex({ roomCode: 1 }, { unique: true });
    await collection.createIndex({ ownerId: 1 });
    await collection.createIndex({ createdAt: -1 });
    indexesEnsured = true;
  }

  return collection;
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Generate a unique 8-character alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ─── CRUD Functions ────────────────────────────────────────────

/**
 * Create a new room
 */
export async function createRoom(
  data: Pick<RoomDocument, "ownerId" | "passwordHash" | "codeLanguage" | "code">
): Promise<WithId<RoomDocument>> {
  const collection = await getRoomsCollection();
  const now = new Date();

  // Generate unique room code (retry on collision)
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await collection.findOne({ roomCode });
    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const doc: RoomDocument = {
    ownerId: data.ownerId,
    roomCode,
    passwordHash: data.passwordHash,
    codeLanguage: data.codeLanguage,
    code: data.code,
    allowedUsers: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

/**
 * Find a room by its unique room code
 */
export async function findRoomByCode(
  roomCode: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  return collection.findOne({ roomCode, isActive: true });
}

/**
 * Find a room by its MongoDB _id
 */
export async function findRoomById(
  id: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Find all rooms owned by a user
 */
export async function findRoomsByOwner(
  ownerId: string
): Promise<WithId<RoomDocument>[]> {
  const collection = await getRoomsCollection();
  return collection
    .find({ ownerId: new ObjectId(ownerId), isActive: true })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Add a user to a room's allowed list (max 5 besides owner)
 */
export async function addUserToRoom(
  roomId: string,
  userId: ObjectId,
  role: "editor" | "viewer" = "viewer"
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();

  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(roomId),
      isActive: true,
      $expr: { $lt: [{ $size: "$allowedUsers" }, 5] },
      "allowedUsers.userId": { $ne: userId }, // prevent duplicates
    },
    {
      $push: { allowedUsers: { userId, role } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Remove a user from a room's allowed list
 */
export async function removeUserFromRoom(
  roomId: string,
  userId: ObjectId
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    {
      $pull: { allowedUsers: { userId } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Update the code content of a room
 */
export async function updateRoomCode(
  roomId: string,
  code: string,
  codeLanguage?: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();

  const updateFields: Record<string, unknown> = {
    code,
    updatedAt: new Date(),
  };
  if (codeLanguage) {
    updateFields.codeLanguage = codeLanguage;
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    { $set: updateFields },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Soft-delete a room by setting isActive to false
 */
export async function deactivateRoom(
  roomId: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    { $set: { isActive: false, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Permanently delete a room
 */
export async function deleteRoom(roomId: string): Promise<boolean> {
  const collection = await getRoomsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(roomId) });
  return result.deletedCount === 1;
}

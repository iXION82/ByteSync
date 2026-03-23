import { ObjectId, type WithId, type Document } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

// ─── User Document Interface ────────────────────────────────────
export interface UserDocument {
  clerkId: string;
  username: string;
  email: string;
  name: string;
  imageUrl?: string;
  joinedRoomIds: ObjectId[];   // max 3 rooms the user has joined
  createdRoomIds: ObjectId[];  // max 3 rooms the user has created
  createdAt: Date;
  updatedAt: Date;
}

// ─── Collection Helper ──────────────────────────────────────────
let indexesEnsured = false;

async function getUsersCollection() {
  const db = await getDatabase();
  const collection = db.collection<UserDocument>("users");

  // Ensure indexes exist (runs once per cold start)
  if (!indexesEnsured) {
    await collection.createIndex({ clerkId: 1 }, { unique: true });
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ username: 1 }, { unique: true });
    indexesEnsured = true;
  }

  return collection;
}

// ─── CRUD Functions ────────────────────────────────────────────

/**
 * Create a new user in MongoDB (typically called from Clerk webhook)
 */
export async function createUser(
  data: Omit<UserDocument, "createdAt" | "updatedAt" | "joinedRoomIds" | "createdRoomIds">
): Promise<WithId<UserDocument>> {
  const collection = await getUsersCollection();
  const now = new Date();

  const doc: UserDocument = {
    ...data,
    joinedRoomIds: [],
    createdRoomIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);

  return {
    _id: result.insertedId,
    ...doc,
  };
}

/**
 * Find a user by their Clerk ID
 */
export async function findUserByClerkId(
  clerkId: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ clerkId });
}

/**
 * Find a user by their username
 */
export async function findUserByUsername(
  username: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ username });
}

/**
 * Find a user by their email
 */
export async function findUserByEmail(
  email: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ email });
}

/**
 * Find a user by their MongoDB _id
 */
export async function findUserById(
  id: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Update a user by their Clerk ID
 */
export async function updateUserByClerkId(
  clerkId: string,
  data: Partial<Omit<UserDocument, "clerkId" | "createdAt" | "updatedAt">>
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { clerkId },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

/**
 * Add a joined room ID to a user (max 3)
 */
export async function addJoinedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();

  // Only push if user has fewer than 3 joined rooms
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

/**
 * Delete a user by their Clerk ID
 */
export async function deleteUserByClerkId(clerkId: string): Promise<boolean> {
  const collection = await getUsersCollection();
  const result = await collection.deleteOne({ clerkId });
  return result.deletedCount === 1;
}

import { ObjectId, type WithId, type Document } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

// ─── User Document Interface ────────────────────────────────────
export interface UserDocument {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
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
    indexesEnsured = true;
  }

  return collection;
}

// ─── CRUD Functions ────────────────────────────────────────────

/**
 * Create a new user in MongoDB (typically called from Clerk webhook)
 */
export async function createUser(
  data: Omit<UserDocument, "createdAt" | "updatedAt">
): Promise<WithId<UserDocument>> {
  const collection = await getUsersCollection();
  const now = new Date();

  const result = await collection.insertOne({
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return {
    _id: result.insertedId,
    ...data,
    createdAt: now,
    updatedAt: now,
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
 * Delete a user by their Clerk ID
 */
export async function deleteUserByClerkId(clerkId: string): Promise<boolean> {
  const collection = await getUsersCollection();
  const result = await collection.deleteOne({ clerkId });
  return result.deletedCount === 1;
}
